import { createClient } from "@/lib/supabase/server";
import { hoyLocal } from "@/lib/format";
import { referenciaL100 } from "@/lib/consumo";
import { sumarDias, type FilaReporte } from "@/lib/reportes";
import { esAdminRol, perfilActual } from "@/lib/permisos";
import ReportesPanel from "./ReportesPanel";

export const dynamic = "force-dynamic";

/** Trae todas las filas de una consulta, de a 1000 (límite de Supabase). */
async function traerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const todo: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data } = await consulta(i, i + 999);
    const lote = data || [];
    todo.push(...lote);
    if (lote.length < 1000) break;
  }
  return todo;
}

/**
 * Cargas con su recorrido y consumo. Usa reporte_consumo(), que calcula el
 * recorrido con el historial completo de cada vehículo y devuelve solo lo
 * que el usuario puede ver (administración: todo; chofer: lo que cargó él).
 * Si la función todavía no existe en la base, usa la vista consumo.
 */
async function traerConsumo(
  supabase: ReturnType<typeof createClient>,
  desdeIso: string,
): Promise<any[]> {
  const columnas =
    "id, registrado_en, vehiculo_id, chofer_id, chofer_nombre, combustible_nombre, litros, costo_total, odometro_km, distancia_km, tanque_lleno";
  const prueba = await supabase
    .rpc("reporte_consumo", { p_desde: desdeIso })
    .select(columnas)
    .range(0, 0);
  if (!prueba.error) {
    return traerTodo<any>(
      (a, b) =>
        supabase
          .rpc("reporte_consumo", { p_desde: desdeIso })
          .select(columnas)
          .range(a, b) as unknown as PromiseLike<{ data: any[] | null }>,
    );
  }
  return traerTodo<any>((a, b) =>
    supabase
      .from("consumo")
      .select(columnas)
      .gte("registrado_en", desdeIso)
      .order("registrado_en", { ascending: true })
      .range(a, b),
  );
}

export default async function ReportesPage() {
  const supabase = createClient();
  const yo = await perfilActual(supabase);
  const esAdmin = esAdminRol(yo?.rol);

  // 13 meses: alcanza para "este año" y para comparar con el periodo anterior
  const desde = sumarDias(hoyLocal(), -400);

  const [
    consumo,
    cargas,
    { data: vehiculos },
    { data: empresas },
    { data: estaciones },
  ] = await Promise.all([
    traerConsumo(supabase, `${desde}T00:00:00-03:00`),
    traerTodo<any>((a, b) =>
      supabase
        .from("cargas")
        .select("id, estacion_id")
        .gte("registrado_en", `${desde}T00:00:00-03:00`)
        .order("registrado_en", { ascending: true })
        .range(a, b),
    ),
    supabase.from("vehiculos").select("*"),
    supabase.from("empresas").select("id, nombre"),
    supabase.from("estaciones_servicio").select("id, nombre, emblemas(nombre)"),
  ]);

  const vehPorId = new Map(
    (vehiculos || []).map((v: any) => [v.id as string, v]),
  );
  const empresaPorId = new Map(
    (empresas || []).map((e: any) => [e.id as string, e.nombre as string]),
  );
  const estPorId = new Map(
    (estaciones || []).map((e: any) => [e.id as string, e]),
  );
  const estacionDeCarga = new Map(
    cargas.map((c: any) => [c.id as string, c.estacion_id as string | null]),
  );

  // Modelos escritos distinto ("MASTER III" / "Master III") se agrupan juntos
  const modeloCanonico = new Map<string, string>();
  const normalizarModelo = (m: string) => {
    const k = m.toUpperCase();
    if (!modeloCanonico.has(k)) modeloCanonico.set(k, m);
    return modeloCanonico.get(k)!;
  };

  const filas: FilaReporte[] = consumo.map((c: any) => {
    const v: any = vehPorId.get(c.vehiculo_id) || {};
    const est: any = estPorId.get(estacionDeCarga.get(c.id) ?? "") || null;
    const modelo = [v.marca, v.modelo]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      id: c.id,
      fecha: hoyLocal(new Date(c.registrado_en)),
      registrado_en: c.registrado_en,
      vehiculo_id: c.vehiculo_id,
      vehiculo: v.nombre ?? "—",
      patente: v.patente ?? "",
      modelo: modelo ? normalizarModelo(modelo) : "Sin modelo",
      tanque:
        v.capacidad_tanque_litros != null
          ? Number(v.capacidad_tanque_litros)
          : null,
      ref_l100: referenciaL100(v),
      alquilado: !!v.es_alquilado,
      empresa: v.empresa_id ? (empresaPorId.get(v.empresa_id) ?? null) : null,
      chofer_id: c.chofer_id,
      chofer: c.chofer_nombre ?? "—",
      combustible: c.combustible_nombre ?? "Sin combustible",
      estacion: est?.nombre ?? "Sin estación",
      emblema: est?.emblemas?.nombre ?? "Sin estación",
      litros: Number(c.litros) || 0,
      gasto: Number(c.costo_total) || 0,
      km: Number(c.odometro_km) || 0,
      recorrido: c.distancia_km != null ? Number(c.distancia_km) : null,
      tanque_lleno: !!c.tanque_lleno,
    };
  });

  // Un chofer solo ve las cargas que registró él (la base ya lo filtra;
  // esto es una segunda barrera)
  const visibles = esAdmin
    ? filas
    : filas.filter((r) => r.chofer_id === yo?.id);

  return <ReportesPanel filas={visibles} hoy={hoyLocal()} esAdmin={esAdmin} />;
}
