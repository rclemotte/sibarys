"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CargarState = { error?: string; success?: string };

export async function crearCarga(
  _prev: CargarState,
  formData: FormData
): Promise<CargarState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Volvé a iniciar sesión." };

  const vehiculo_id = String(formData.get("vehiculo_id") || "");
  const tipo_combustible_id =
    String(formData.get("tipo_combustible_id") || "") || null;
  const odometro_km = Number(formData.get("odometro_km"));
  const litros = Number(formData.get("litros"));
  const total = Number(formData.get("total"));
  const estacion_id = String(formData.get("estacion_id") || "").trim() || null;
  const notas = String(formData.get("notas") || "").trim() || null;
  const tanque_lleno = formData.get("tanque_lleno") === "on";
  const fechaRaw = String(formData.get("registrado_en") || "");
  const registrado_en = fechaRaw
    ? new Date(fechaRaw).toISOString()
    : new Date().toISOString();

  if (!vehiculo_id) return { error: "Elegí un vehículo." };
  if (!tipo_combustible_id) return { error: "Elegí el tipo de combustible." };
  if (!odometro_km || odometro_km <= 0)
    return { error: "Ingresá un kilometraje válido." };
  if (!litros || litros <= 0) return { error: "Ingresá los litros cargados." };
  if (!total || total <= 0)
    return { error: "Ingresá el total cargado ($)." };

  // Precio por litro = total pagado ÷ litros cargados
  const precio_litro = Math.round((total / litros) * 100) / 100;
  const costo_total = total;

  // El odómetro no puede ser menor al de la última carga del vehículo
  const { data: ultima } = await supabase
    .from("cargas")
    .select("odometro_km")
    .eq("vehiculo_id", vehiculo_id)
    .order("odometro_km", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima && odometro_km < Number(ultima.odometro_km)) {
    return {
      error: `El kilometraje (${odometro_km}) es menor al de la última carga (${ultima.odometro_km}). Revisá el número.`,
    };
  }

  // Si eligió una estación, componemos también el texto legacy "estacion"
  // (lo leen historial, reportes y exportar) para no tener que tocarlos.
  let estacion: string | null = null;
  if (estacion_id) {
    const { data: est } = await supabase
      .from("estaciones_servicio")
      .select("nombre, localidad, emblemas(nombre)")
      .eq("id", estacion_id)
      .maybeSingle();
    if (est) {
      const emblema = (est as any).emblemas?.nombre as string | undefined;
      estacion =
        `${est.nombre}` +
        (emblema ? ` (${emblema})` : "") +
        (est.localidad ? ` · ${est.localidad}` : "");
    }
  }

  const { error } = await supabase.from("cargas").insert({
    vehiculo_id,
    chofer_id: user.id,
    tipo_combustible_id,
    odometro_km,
    litros,
    precio_litro,
    costo_total,
    estacion,
    estacion_id,
    notas,
    tanque_lleno,
    registrado_en,
  });

  if (error) return { error: "No se pudo guardar la carga: " + error.message };

  revalidatePath("/dashboard");
  revalidatePath("/historial");
  revalidatePath("/reportes");
  return { success: "¡Carga registrada con éxito!" };
}
