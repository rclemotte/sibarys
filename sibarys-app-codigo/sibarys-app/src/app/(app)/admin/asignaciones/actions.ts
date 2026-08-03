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

export type AsigState = { error?: string; success?: string };

export async function crearAsignacion(
  _prev: AsigState,
  formData: FormData
): Promise<AsigState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede asignar vehículos." };

  const vehiculo_id = String(formData.get("vehiculo_id") || "");
  const chofer_id = String(formData.get("chofer_id") || "");

  if (!vehiculo_id) return { error: "Elegí un vehículo." };
  if (!chofer_id) return { error: "Elegí un chofer." };

  const { error } = await supabase
    .from("asignaciones")
    .insert({ vehiculo_id, chofer_id, activo: true });

  if (error) {
    if (error.code === "23505")
      return { error: "Ese vehículo ya está asignado a ese chofer." };
    return { error: "No se pudo asignar: " + error.message };
  }
  revalidatePath("/admin/asignaciones");
  return { success: "Vehículo asignado." };
}

export async function quitarAsignacion(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  await supabase.from("asignaciones").delete().eq("id", id);
  revalidatePath("/admin/asignaciones");
}
