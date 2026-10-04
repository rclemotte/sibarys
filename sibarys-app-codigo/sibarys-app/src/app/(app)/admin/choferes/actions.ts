"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cedulaAEmail, normalizarCedula } from "@/lib/auth";
import {
  PERMISOS,
  esSuperadmin,
  perfilActual,
  tienePermiso,
  type PerfilConPermisos,
} from "@/lib/permisos";

/** Quién llama: tiene que ser superadmin o admin con permiso de usuarios. */
async function gestor() {
  const supabase = createClient();
  const yo = await perfilActual(supabase);
  const ok = tienePermiso(yo, "puede_gestionar_usuarios");
  return { supabase, yo, ok, esSuper: esSuperadmin(yo?.rol) };
}

/**
 * ¿"yo" puede tocar (baja, contraseña) a "otro"?
 * El superadmin a cualquiera; un admin, solo a choferes.
 */
function puedeTocar(
  yo: PerfilConPermisos | null,
  otro: { rol: string | null } | null
): boolean {
  if (!yo || !otro) return false;
  if (esSuperadmin(yo.rol)) return true;
  return otro.rol === "chofer";
}

async function rolDe(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ rol: string | null } | null> {
  const { data } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export type NuevoUsuarioState = { error?: string; success?: string };

export async function crearUsuario(
  _prev: NuevoUsuarioState,
  formData: FormData
): Promise<NuevoUsuarioState> {
  // 1) Verificar que quien llama puede gestionar usuarios
  const { ok, esSuper } = await gestor();
  if (!ok) return { error: "No tenés permiso para crear usuarios." };

  const nombre = String(formData.get("nombre_completo") || "").trim();
  const cedula = normalizarCedula(String(formData.get("cedula") || ""));
  const password = String(formData.get("password") || "");
  const rol = String(formData.get("rol") || "chofer");

  if (!nombre) return { error: "Ingresá el nombre." };
  if (!cedula) return { error: "Ingresá la cédula (solo números)." };
  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (rol !== "chofer" && rol !== "admin")
    return { error: "Rol inválido." };
  if (rol === "admin" && !esSuper)
    return { error: "Solo el súper admin puede crear administradores." };

  const email = cedulaAEmail(cedula);

  // 2) Crear el usuario con la clave secreta (solo en el servidor)
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor. Revisá el .env.local.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // queda confirmado, puede iniciar sesión ya
    user_metadata: {
      nombre_completo: nombre,
      rol,
      cedula,
      debe_cambiar_password: false,
    },
  });

  if (error) {
    if (
      error.message?.toLowerCase().includes("already") ||
      (error as any).code === "email_exists"
    )
      return { error: "Ya existe un usuario con esa cédula." };
    return { error: "No se pudo crear el usuario: " + error.message };
  }

  // 3) Asegurar el perfil (por si el trigger no alcanzó a tomar los metadatos)
  if (data.user) {
    await admin.from("perfiles").upsert({
      id: data.user.id,
      nombre_completo: nombre,
      cedula,
      rol,
      activo: true,
      debe_cambiar_password: false,
    });
  }

  revalidatePath("/admin/choferes");
  return {
    success: `Usuario creado. Entra con la cédula ${cedula} y la contraseña que le asignaste.`,
  };
}

export type AsignarPasswordState = { error?: string; success?: string };

/**
 * El admin le pone (o le cambia) la contraseña a un usuario.
 * No se le pide al usuario que la cambie después: entra directo con esta.
 */
export async function asignarPassword(
  _prev: AsignarPasswordState,
  formData: FormData
): Promise<AsignarPasswordState> {
  const { supabase, yo, ok } = await gestor();
  if (!ok) return { error: "No tenés permiso para cambiar contraseñas." };

  const id = String(formData.get("id") || "");
  if (!puedeTocar(yo, await rolDe(supabase, id)))
    return {
      error: "Solo el súper admin puede cambiar la contraseña de un administrador.",
    };
  const password = String(formData.get("password") || "");
  if (!id) return { error: "Usuario inválido." };
  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor. Revisá el .env.local.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error)
    return { error: "No se pudo cambiar la contraseña: " + error.message };

  await admin
    .from("perfiles")
    .update({ debe_cambiar_password: false })
    .eq("id", id);

  revalidatePath("/admin/choferes");
  return { success: "Contraseña actualizada." };
}

/** Chofer <-> Admin. Solo el superadmin. No aplica a superadmins ni a uno mismo. */
export async function cambiarRol(formData: FormData) {
  const { supabase, yo, esSuper } = await gestor();
  if (!esSuper || !yo) return;

  const id = String(formData.get("id"));
  if (id === yo.id) return;
  const otro = await rolDe(supabase, id);
  if (!otro || esSuperadmin(otro.rol)) return;

  const siguiente = otro.rol === "admin" ? "chofer" : "admin";
  await supabase.from("perfiles").update({ rol: siguiente }).eq("id", id);
  revalidatePath("/admin/choferes");
}

export async function toggleActivo(formData: FormData) {
  const { supabase, yo, ok } = await gestor();
  if (!ok || !yo) return;

  const id = String(formData.get("id"));
  if (id === yo.id) return; // nadie se da de baja a sí mismo
  if (!puedeTocar(yo, await rolDe(supabase, id))) return;

  const activo = formData.get("activo") === "true";
  await supabase.from("perfiles").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/choferes");
}

/** El superadmin define qué puede editar un admin. */
export async function guardarPermisos(formData: FormData) {
  const { supabase, esSuper } = await gestor();
  if (!esSuper) return;

  const id = String(formData.get("id"));
  const otro = await rolDe(supabase, id);
  if (otro?.rol !== "admin") return;

  const cambios: Record<string, boolean> = {};
  for (const p of PERMISOS) cambios[p.campo] = formData.get(p.campo) === "on";

  await supabase.from("perfiles").update(cambios).eq("id", id);
  revalidatePath("/admin/choferes");
}
