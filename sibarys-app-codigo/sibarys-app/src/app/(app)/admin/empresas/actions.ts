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

export type EmpresaState = { error?: string; success?: string };

export async function crearEmpresa(
  _prev: EmpresaState,
  formData: FormData
): Promise<EmpresaState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede gestionar empresas." };

  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return { error: "Ingresá el nombre de la empresa." };

  const { error } = await supabase.from("empresas").insert({ nombre });
  if (error) {
    if (error.code === "23505") return { error: "Esa empresa ya existe." };
    return { error: "No se pudo crear: " + error.message };
  }
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/vehiculos");
  return { success: "Empresa agregada." };
}

export async function toggleEmpresa(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("empresas").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/vehiculos");
}
