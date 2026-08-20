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

export type EmblemaState = { error?: string; success?: string };

export async function crearEmblema(
  _prev: EmblemaState,
  formData: FormData
): Promise<EmblemaState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede gestionar emblemas." };

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return { error: "Ingresá el nombre del emblema." };

  const { error } = await supabase.from("emblemas").insert({ nombre });
  if (error) {
    if (error.code === "23505") return { error: "Ese emblema ya existe." };
    return { error: "No se pudo crear: " + error.message };
  }
  revalidatePath("/admin/emblemas");
  revalidatePath("/admin/estaciones");
  return { success: "Emblema agregado." };
}

export async function toggleEmblema(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("emblemas").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/emblemas");
  revalidatePath("/admin/estaciones");
}
