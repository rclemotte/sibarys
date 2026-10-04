"use server";

import { tienePermiso } from "@/lib/permisos";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CorregirState = { error?: string; success?: string };

/**
 * El admin corrige el odómetro de una carga mal ingresada.
 * El motivo es obligatorio. El valor original se guarda la primera vez
 * que se corrige (si se corrige de nuevo, se conserva el original de verdad).
 */
export async function corregirOdometro(
  _prev: CorregirState,
  formData: FormData,
): Promise<CorregirState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Volvé a iniciar sesión." };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!tienePermiso(perfil, "puede_corregir_km"))
    return { error: "No tenés permiso para corregir el kilometraje." };

  const id = String(formData.get("id") || "");
  const nuevoKm = Number(
    String(formData.get("odometro_km") || "")
      .trim()
      .replace(",", "."),
  );
  const motivo = String(formData.get("motivo") || "").trim();

  if (!id) return { error: "Carga inválida." };
  if (!Number.isFinite(nuevoKm) || nuevoKm <= 0)
    return { error: "Ingresá un kilometraje válido." };
  if (motivo.length < 3)
    return { error: "Escribí el motivo de la corrección." };

  const { data: carga, error: errLeer } = await supabase
    .from("cargas")
    .select("odometro_km, odometro_original")
    .eq("id", id)
    .maybeSingle();
  if (errLeer || !carga) return { error: "No se encontró la carga." };

  if (Number(carga.odometro_km) === nuevoKm)
    return { error: "Es el mismo kilometraje que ya tiene." };

  const { error } = await supabase
    .from("cargas")
    .update({
      odometro_km: nuevoKm,
      odometro_original: carga.odometro_original ?? carga.odometro_km,
      odometro_corregido_motivo: motivo,
      odometro_corregido_por: user.id,
      odometro_corregido_en: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "No se pudo corregir: " + error.message };

  revalidatePath("/historial");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  return { success: "Kilometraje corregido." };
}
