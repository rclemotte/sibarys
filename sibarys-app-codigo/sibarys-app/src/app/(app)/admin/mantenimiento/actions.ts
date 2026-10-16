"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { perfilActual, tienePermiso } from "@/lib/permisos";

export type MantState = { error?: string; success?: string };

const num = (v: FormDataEntryValue | null) =>
  Number(
    String(v ?? "")
      .trim()
      .replace(",", "."),
  );

/** Registra un mantenimiento: fecha, km al hacerlo, km del próximo y qué se hizo. */
export async function registrarMantenimiento(
  _prev: MantState,
  formData: FormData,
): Promise<MantState> {
  const supabase = createClient();
  const yo = await perfilActual(supabase);
  if (!yo || !tienePermiso(yo, "puede_editar_vehiculos"))
    return { error: "No tenés permiso para registrar mantenimientos." };

  const vehiculo_id = String(formData.get("vehiculo_id") || "");
  const fecha = String(formData.get("fecha") || "");
  const km = num(formData.get("km"));
  const km_proximo = num(formData.get("km_proximo"));
  const descripcion = String(formData.get("descripcion") || "").trim();

  if (!vehiculo_id) return { error: "Elegí el vehículo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elegí la fecha." };
  if (!Number.isFinite(km) || km <= 0)
    return {
      error: "Ingresá el kilometraje del vehículo al hacer el mantenimiento.",
    };
  if (!Number.isFinite(km_proximo) || km_proximo <= km)
    return {
      error: "El km del próximo mantenimiento tiene que ser mayor al actual.",
    };
  if (descripcion.length < 3)
    return { error: "Contá brevemente qué se le hizo." };

  const { error } = await supabase.from("mantenimientos").insert({
    vehiculo_id,
    fecha,
    km,
    km_proximo,
    descripcion,
    creado_por: yo.id,
  });
  if (error)
    return {
      error:
        "No se pudo guardar. ¿Se corrió el SQL migracion_mantenimiento.sql? (" +
        error.message +
        ")",
    };

  revalidatePath("/admin/mantenimiento");
  revalidatePath("/dashboard");
  return { success: "Mantenimiento registrado." };
}
