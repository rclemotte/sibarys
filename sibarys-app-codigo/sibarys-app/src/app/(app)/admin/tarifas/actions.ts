"use server";

import { tienePermiso } from "@/lib/permisos";
import { hoyLocal } from "@/lib/format";
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
    .select("*")
    .eq("id", user.id)
    .single();
  return { supabase, user, ok: tienePermiso(perfil, "puede_editar_catalogos") };
}

export type TarifaState = { error?: string; success?: string };

/**
 * Precio de referencia por emblema y tipo de combustible, desde una fecha.
 * Solo sirve para controlar lo que pagan los choferes: no cambia la carga.
 */
export async function agregarPrecio(
  _prev: TarifaState,
  formData: FormData,
): Promise<TarifaState> {
  const { supabase, user, ok } = await requireAdmin();
  if (!ok) return { error: "No tenés permiso para cargar precios." };

  const emblema_id = String(formData.get("emblema_id") || "");
  const tipo_combustible_id = String(formData.get("tipo_combustible_id") || "");
  const precio = Number(String(formData.get("precio") || "").replace(/\D/g, ""));
  const vigente_desde = String(formData.get("vigente_desde") || "") || hoyLocal();

  if (!emblema_id) return { error: "Elegí el emblema." };
  if (!tipo_combustible_id) return { error: "Elegí el combustible." };
  if (!precio || precio <= 0) return { error: "Ingresá un precio válido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigente_desde))
    return { error: "Revisá la fecha." };

  const { error } = await supabase.from("precios_emblema").upsert(
    { emblema_id, tipo_combustible_id, precio, vigente_desde, creado_por: user!.id },
    { onConflict: "emblema_id,tipo_combustible_id,vigente_desde" },
  );
  if (error)
    return {
      error: error.message.includes("precios_emblema")
        ? "Falta correr el SQL migracion_precios_emblema.sql en Supabase."
        : "No se pudo guardar: " + error.message,
    };

  revalidatePath("/admin/tarifas");
  revalidatePath("/reportes/precios");
  return { success: "Precio guardado." };
}

/** Borra un precio cargado por error. */
export async function borrarPrecio(id: string): Promise<TarifaState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "No tenés permiso." };
  const { error } = await supabase.from("precios_emblema").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar: " + error.message };
  revalidatePath("/admin/tarifas");
  revalidatePath("/reportes/precios");
  return { success: "Precio borrado." };
}
