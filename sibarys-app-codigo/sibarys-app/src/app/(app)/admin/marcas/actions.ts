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

export type MarcaState = { error?: string; success?: string };

export async function crearMarca(
  _prev: MarcaState,
  formData: FormData
): Promise<MarcaState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede gestionar marcas." };

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return { error: "Ingresá el nombre de la marca." };

  const { error } = await supabase.from("marcas").insert({ nombre });
  if (error) {
    if (error.code === "23505")
      return { error: "Esa marca ya existe." };
    return { error: "No se pudo crear: " + error.message };
  }
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/vehiculos");
  return { success: "Marca agregada." };
}

export async function toggleMarca(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("marcas").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/vehiculos");
}
