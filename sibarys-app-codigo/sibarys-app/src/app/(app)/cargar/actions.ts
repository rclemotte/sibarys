"use server";

import { errorLitrosTanque } from "@/lib/consumo";
import { textoEstacion } from "@/lib/estaciones";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { perfilActual, tienePermiso } from "@/lib/permisos";
import { fmtDateTime, fmtNumber, instanteLocal } from "@/lib/format";

/** Datos del comprobante que el chofer comparte por WhatsApp. */
export type Comprobante = {
  numero: string;
  fecha: string; // ISO
  vehiculo: string;
  patente: string;
  chofer: string;
  estacion: string | null;
  combustible: string | null;
  litros: number;
  precioLitro: number;
  total: number;
  odometro: number;
  kmRecorridos: number | null;
  tanqueLleno: boolean;
};

export type CargarState = {
  error?: string;
  success?: string;
  comprobante?: Comprobante;
};

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
  // "Otra estación": no está en la lista; se elige el emblema y se escribe el nombre
  const estacionOtra = formData.get("estacion_otra") === "1";
  const emblema_id = String(formData.get("emblema_id") || "").trim() || null;
  const estacionNombre = String(formData.get("estacion_nombre") || "").trim();
  const notas = String(formData.get("notas") || "").trim() || null;
  const tanque_lleno = formData.get("tanque_lleno") === "on";

  // Carga olvidada: administración la registra después, a nombre del
  // chofer y con la fecha real. Solo con permiso de corregir cargas.
  const olvidada = formData.get("modo") === "olvidada";
  let chofer_id = user.id;
  let registrado_en = new Date().toISOString();
  let motivo = "";
  let choferNombre = "";
  if (olvidada) {
    const yo = await perfilActual(supabase);
    if (!tienePermiso(yo, "puede_corregir_km"))
      return { error: "No tenés permiso para registrar cargas de otros choferes." };
    chofer_id = String(formData.get("chofer_id") || "");
    if (!chofer_id) return { error: "Elegí el chofer que hizo la carga." };
    const fecha = instanteLocal(String(formData.get("registrado_en") || ""));
    if (!fecha) return { error: "Ingresá la fecha y hora real de la carga." };
    if (fecha.getTime() > Date.now() + 5 * 60000)
      return { error: "La fecha de la carga no puede ser futura." };
    registrado_en = fecha.toISOString();
    motivo = String(formData.get("motivo") || "").trim();
    if (motivo.length < 3)
      return { error: "Escribí el motivo (ej. el chofer se olvidó de cargarla)." };
    const { data: ch } = await supabase
      .from("perfiles")
      .select("nombre_completo")
      .eq("id", chofer_id)
      .maybeSingle();
    if (!ch) return { error: "No se encontró el chofer." };
    choferNombre = ch.nombre_completo || "(sin nombre)";
  }

  if (!vehiculo_id) return { error: "Elegí un vehículo." };
  if (!tipo_combustible_id) return { error: "Elegí el tipo de combustible." };
  if (!odometro_km || odometro_km <= 0)
    return { error: "Ingresá un kilometraje válido." };
  if (!litros || litros <= 0) return { error: "Ingresá los litros cargados." };
  if (!total || total <= 0)
    return { error: "Ingresá el total cargado (₲)." };
  if (estacionOtra) {
    if (!emblema_id) return { error: "Elegí el emblema de la estación." };
    if (estacionNombre.length < 2)
      return { error: "Escribí el nombre o la zona de la estación." };
  } else if (!estacion_id) {
    return {
      error: "Elegí la estación de servicio. Si no está en la lista, elegí «Otra estación».",
    };
  }

  // Precio por litro = total pagado ÷ litros cargados
  const precio_litro = Math.round((total / litros) * 100) / 100;
  const costo_total = total;

  // Los litros no pueden superar la capacidad del tanque (+10%)
  const { data: veh } = await supabase
    .from("vehiculos")
    .select("nombre, patente, capacidad_tanque_litros")
    .eq("id", vehiculo_id)
    .maybeSingle();
  if (veh) {
    const errTanque = errorLitrosTanque(litros, veh);
    if (errTanque) return { error: errTanque };
  }

  if (olvidada) {
    // Una carga con fecha pasada tiene que quedar entre la carga anterior
    // y la siguiente de ese vehículo (por fecha).
    const [{ data: antes }, { data: despues }, { data: igual }] =
      await Promise.all([
        supabase
          .from("cargas")
          .select("odometro_km, registrado_en")
          .eq("vehiculo_id", vehiculo_id)
          .lt("registrado_en", registrado_en)
          .order("registrado_en", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("cargas")
          .select("odometro_km, registrado_en")
          .eq("vehiculo_id", vehiculo_id)
          .gt("registrado_en", registrado_en)
          .order("registrado_en", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("cargas")
          .select("registrado_en")
          .eq("vehiculo_id", vehiculo_id)
          .eq("odometro_km", odometro_km)
          .limit(1)
          .maybeSingle(),
      ]);
    if (igual)
      return {
        error: `Este vehículo ya tiene una carga con ${fmtNumber(odometro_km)} km (${fmtDateTime(igual.registrado_en)}). Revisá el Historial: puede que ya esté registrada.`,
      };
    if (antes && odometro_km < Number(antes.odometro_km))
      return {
        error: `El kilometraje (${fmtNumber(odometro_km)}) es menor al de la carga anterior a esa fecha (${fmtNumber(Number(antes.odometro_km))} km, ${fmtDateTime(antes.registrado_en)}). Revisá el km o la fecha.`,
      };
    if (despues && odometro_km > Number(despues.odometro_km))
      return {
        error: `El kilometraje (${fmtNumber(odometro_km)}) es mayor al de la carga siguiente (${fmtNumber(Number(despues.odometro_km))} km, ${fmtDateTime(despues.registrado_en)}). Revisá el km o la fecha.`,
      };
  }

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

  if (!olvidada && ultimoKm !== null && odometro_km < ultimoKm) {
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

  // Texto legacy "estacion" (lo leen historial, reportes y exportar)
  const estacion = estacionOtra
    ? estacionNombre
    : await textoEstacion(supabase, estacion_id);

  const { data: nueva, error } = await supabase.from("cargas").insert({
    vehiculo_id,
    chofer_id,
    tipo_combustible_id,
    odometro_km,
    litros,
    precio_litro,
    costo_total,
    estacion,
    estacion_id: estacionOtra ? null : estacion_id,
    // Solo se manda si es "Otra estación" (así funciona aunque falte el SQL)
    ...(estacionOtra ? { emblema_id } : {}),
    notas,
    tanque_lleno,
    registrado_en,
  }).select("id").single();

  if (error) {
    if (error.message?.includes("CARGA_DUPLICADA"))
      return { error: MENSAJE_DUPLICADO };
    if (error.message?.includes("emblema_id"))
      return {
        error:
          "Por ahora elegí una estación de la lista (falta un ajuste en la base para «Otra estación»). Avisale a administración.",
      };
    return { error: "No se pudo guardar la carga: " + error.message };
  }

  if (olvidada && nueva) {
    // Queda registrado quién la cargó por el chofer y por qué
    await supabase.from("cargas_correcciones").insert({
      carga_id: nueva.id,
      campo: "Registro",
      valor_anterior: null,
      valor_nuevo: `Cargada por administración a nombre de ${choferNombre}`,
      motivo,
      corregido_por: user.id,
      corregido_en: new Date().toISOString(),
    });
  }

  // Comprobante para compartir (nombres de chofer y combustible)
  const [{ data: tc }, { data: ch }] = await Promise.all([
    supabase.from("tipos_combustible").select("nombre").eq("id", tipo_combustible_id).maybeSingle(),
    olvidada
      ? Promise.resolve({ data: null })
      : supabase.from("perfiles").select("nombre_completo").eq("id", user.id).maybeSingle(),
  ]);
  const comprobante: Comprobante | undefined = nueva
    ? {
        numero: String(nueva.id).slice(0, 8).toUpperCase(),
        fecha: registrado_en,
        vehiculo: veh?.nombre ?? "",
        patente: (veh as any)?.patente ?? "",
        chofer: olvidada ? choferNombre : ((ch as any)?.nombre_completo ?? ""),
        estacion: estacion ?? null,
        combustible: tc?.nombre ?? null,
        litros,
        precioLitro: precio_litro,
        total: costo_total,
        odometro: odometro_km,
        kmRecorridos:
          !olvidada && ultimoKm !== null && odometro_km > ultimoKm ? odometro_km - ultimoKm : null,
        tanqueLleno: tanque_lleno,
      }
    : undefined;

  revalidatePath("/dashboard");
  revalidatePath("/historial");
  revalidatePath("/reportes");
  if (olvidada)
    return {
      success: `Carga registrada a nombre de ${choferNombre} (${fmtDateTime(registrado_en)}).`,
      comprobante,
    };
  return { success: "¡Carga registrada con éxito!", comprobante };
}
