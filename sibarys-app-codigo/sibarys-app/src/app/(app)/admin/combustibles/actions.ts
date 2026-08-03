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

export type CombustibleState = { error?: string; success?: string };

export async function crearCombustible(
  _prev: CombustibleState,
  formData: FormData
): Promise<CombustibleState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede gestionar combustibles." };

  const nombre = String(formData.get("nombre") || "").trim();
  const octRaw = formData.get("octanaje");
  const octanaje = octRaw && String(octRaw).trim() ? Number(octRaw) : null;

  if (!nombre) return { error: "Ingresá el nombre del combustible." };

  const { error } = await supabase
    .from("tipos_combustible")
    .insert({ nombre, octanaje });

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe un combustible con ese nombre." };
    return { error: "No se pudo crear: " + error.message };
  }
  revalidatePath("/admin/combustibles");
  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/vehiculos");
  return { success: "Combustible agregado." };
}

export async function toggleCombustible(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase
    .from("tipos_combustible")
    .update({ activo: !activo })
    .eq("id", id);
  revalidatePath("/admin/combustibles");
  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/vehiculos");
}
