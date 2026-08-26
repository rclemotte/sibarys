"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cedulaAEmail, normalizarCedula } from "@/lib/auth";

async function esAdmin(
  supabase: ReturnType<typeof createClient>,
  uid: string
) {
  const { data } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", uid)
    .single();
  return data?.rol === "admin";
}

export type NuevoUsuarioState = { error?: string; success?: string };

export async function crearUsuario(
  _prev: NuevoUsuarioState,
  formData: FormData
): Promise<NuevoUsuarioState> {
  // 1) Verificar que quien llama es admin
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await esAdmin(supabase, user.id)))
    return { error: "Solo el administrador puede crear usuarios." };

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
      debe_cambiar_password: true,
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
      debe_cambiar_password: true,
    });
  }

  revalidatePath("/admin/choferes");
  return {
    success: `Usuario creado (cédula ${cedula}). En su primer ingreso deberá cambiar la contraseña.`,
  };
}

export async function cambiarRol(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await esAdmin(supabase, user.id))) return;

  const id = String(formData.get("id"));
  const rol = String(formData.get("rol"));
  const siguiente = rol === "admin" ? "chofer" : "admin";
  await supabase.from("perfiles").update({ rol: siguiente }).eq("id", id);
  revalidatePath("/admin/choferes");
}

export async function toggleActivo(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await esAdmin(supabase, user.id))) return;

  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("perfiles").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/choferes");
}
