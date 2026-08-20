"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  return { supabase, ok: perfil?.rol === "admin" };
}

export type EstacionState = { error?: string; success?: string };

export async function crearEstacion(
  _prev: EstacionState,
  formData: FormData
): Promise<EstacionState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok)
    return { error: "Solo el administrador puede gestionar estaciones." };

  const nombre = String(formData.get("nombre") || "").trim();
  const localidad = String(formData.get("localidad") || "").trim() || null;
  const emblema_id = String(formData.get("emblema_id") || "").trim() || null;

  if (!nombre) return { error: "Ingresá el nombre de la estación." };

  const { error } = await supabase
    .from("estaciones_servicio")
    .insert({ nombre, localidad, emblema_id });
  if (error) return { error: "No se pudo crear: " + error.message };

  revalidatePath("/admin/estaciones");
  revalidatePath("/cargar");
  return { success: "Estación agregada." };
}

export async function toggleEstacion(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase
    .from("estaciones_servicio")
    .update({ activo: !activo })
    .eq("id", id);
  revalidatePath("/admin/estaciones");
  revalidatePath("/cargar");
}
