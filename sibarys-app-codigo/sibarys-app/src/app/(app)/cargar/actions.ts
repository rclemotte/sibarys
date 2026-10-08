"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CargarState = { error?: string; success?: string };

const MINUTOS_DUPLICADO = 10;
const MENSAJE_DUPLICADO =
  "Esta carga ya fue registrada hace un momento (mismo vehículo, kilometraje y litros). Revisá el Historial antes de cargarla de nuevo.";

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

  // El odómetro no puede ser menor al de la última carga del vehículo.
  // Como ahora varios choferes usan el mismo vehículo, se consulta con
  // ultimo_odometro() (ve las cargas de todos). Si esa función todavía no
  // existe en la base, se usa la consulta directa (solo ve las propias).
  let ultimoKm: number | null = null;
  const { data: rpcKm, error: rpcError } = await supabase.rpc(
    "ultimo_odometro",
    { p_vehiculo_id: vehiculo_id }
  );
  if (!rpcError) {
    ultimoKm = rpcKm === null || rpcKm === undefined ? null : Number(rpcKm);
  } else {
    const { data: ultima } = await supabase
      .from("cargas")
      .select("odometro_km")
      .eq("vehiculo_id", vehiculo_id)
      .order("odometro_km", { ascending: false })
      .limit(1)
      .maybeSingle();
    ultimoKm = ultima ? Number(ultima.odometro_km) : null;
  }

  if (ultimoKm !== null && odometro_km < ultimoKm) {
    return {
      error: `El kilometraje (${odometro_km}) es menor al de la última carga (${ultimoKm}). Revisá el número.`,
    };
  }

  // Evitar cargas duplicadas: mismo vehículo, km y litros en los últimos
  // minutos (ej. doble toque en "Guardar"). La base también lo controla.
  const desde = new Date(Date.now() - MINUTOS_DUPLICADO * 60000).toISOString();
  const { data: repetida } = await supabase
    .from("cargas")
    .select("id")
    .eq("vehiculo_id", vehiculo_id)
    .eq("odometro_km", odometro_km)
    .eq("litros", litros)
    .gte("creado_en", desde)
    .limit(1)
    .maybeSingle();
  if (repetida) return { error: MENSAJE_DUPLICADO };

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

  if (error) {
    if (error.message?.includes("CARGA_DUPLICADA"))
      return { error: MENSAJE_DUPLICADO };
    return { error: "No se pudo guardar la carga: " + error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/historial");
  revalidatePath("/reportes");
  return { success: "¡Carga registrada con éxito!" };
}
