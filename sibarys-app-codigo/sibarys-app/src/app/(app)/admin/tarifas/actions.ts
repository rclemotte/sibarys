"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  return { supabase, user, ok: perfil?.rol === "admin" };
}

export type TarifaState = { error?: string; success?: string };

export async function agregarPrecio(
  _prev: TarifaState,
  formData: FormData
): Promise<TarifaState> {
  const { supabase, user, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede gestionar tarifas." };

  const tipo_combustible_id = String(formData.get("tipo_combustible_id") || "");
  const precio = Number(formData.get("precio"));
  const vigente_desde =
    String(formData.get("vigente_desde") || "") ||
    new Date().toISOString().slice(0, 10);

  if (!tipo_combustible_id) return { error: "Elegí el combustible." };
  if (!precio || precio <= 0) return { error: "Ingresá un precio válido." };

  const { error } = await supabase.from("precios_combustible").upsert(
    {
      tipo_combustible_id,
      precio,
      vigente_desde,
      creado_por: user!.id,
    },
    { onConflict: "tipo_combustible_id,vigente_desde" }
  );

  if (error) return { error: "No se pudo guardar: " + error.message };

  revalidatePath("/admin/tarifas");
  revalidatePath("/cargar");
  return { success: "Precio actualizado." };
}
