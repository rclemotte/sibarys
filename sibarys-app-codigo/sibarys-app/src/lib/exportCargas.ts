// Consulta de cargas para exportar (Excel) o imprimir (PDF).
// Se usa igual desde el navegador y desde el servidor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { inicioDelDiaLocal } from "@/lib/format";
import type { Consumo } from "@/lib/types";

export type FiltrosExport = {
  choferId?: string;
  vehiculoId?: string;
  emblemaId?: string;
  desde?: string; // "YYYY-MM-DD"
  hasta?: string;
};

export type FilaExport = Consumo & { emblema: string | null };

const LOTE = 1000; // límite de filas por consulta de Supabase

/** Cargas (con su consumo y emblema) que cumplen los filtros, de la más nueva a la más vieja. */
export async function traerCargasExport(
  supabase: SupabaseClient,
  f: FiltrosExport,
): Promise<FilaExport[]> {
  const cargas: Consumo[] = [];
  for (let i = 0; ; i += LOTE) {
    let q = supabase.from("consumo").select("*");
    if (f.choferId) q = q.eq("chofer_id", f.choferId);
    if (f.vehiculoId) q = q.eq("vehiculo_id", f.vehiculoId);
    if (f.desde)
      q = q.gte("registrado_en", inicioDelDiaLocal(f.desde).toISOString());
    if (f.hasta)
      q = q.lt(
        "registrado_en",
        new Date(inicioDelDiaLocal(f.hasta).getTime() + 86400000).toISOString(),
      );
    const { data, error } = await q
      .order("registrado_en", { ascending: false })
      .order("id")
      .range(i, i + LOTE - 1);
    if (error) throw error;
    const lote = (data || []) as Consumo[];
    cargas.push(...lote);
    if (lote.length < LOTE) break;
  }
  if (cargas.length === 0) return [];

  // Estación de cada carga (la vista consumo no la trae) y su emblema
  const estacionDe = new Map<string, string | null>();
  const ids = cargas.map((c) => c.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("cargas")
      .select("id, estacion_id")
      .in("id", ids.slice(i, i + 200));
    if (error) throw error;
    (data || []).forEach((c: any) => estacionDe.set(c.id, c.estacion_id));
  }
  const { data: est, error: errEst } = await supabase
    .from("estaciones_servicio")
    .select("id, emblema_id, emblemas(nombre)");
  if (errEst) throw errEst;
  const emblemaDe = new Map<string, { id: string | null; nombre: string | null }>(
    (est || []).map((e: any) => [
      e.id as string,
      { id: e.emblema_id ?? null, nombre: e.emblemas?.nombre ?? null },
    ]),
  );

  const filas = cargas.map((c) => {
    const estId = estacionDe.get(c.id);
    const emb = estId ? emblemaDe.get(estId) : undefined;
    return { ...c, emblema: emb?.nombre ?? null, _emblemaId: emb?.id ?? null };
  });
  return (f.emblemaId ? filas.filter((r) => r._emblemaId === f.emblemaId) : filas).map(
    ({ _emblemaId, ...r }) => r,
  );
}

/** Totales de un conjunto de cargas (para el encabezado del PDF). */
export function totalesExport(filas: FilaExport[]) {
  let litros = 0,
    gasto = 0,
    km = 0,
    litrosTramo = 0;
  for (const r of filas) {
    litros += Number(r.litros) || 0;
    gasto += Number(r.costo_total) || 0;
    const d = r.distancia_km != null ? Number(r.distancia_km) : 0;
    if (d > 0) {
      km += d;
      litrosTramo += Number(r.litros) || 0;
    }
  }
  return {
    cargas: filas.length,
    litros,
    gasto,
    km,
    l100: km > 0 ? (litrosTramo / km) * 100 : null,
  };
}
