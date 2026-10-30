// Control de km de vehículos alquilados: cuántos km recorrió desde la fecha
// de control y cuántos le quedan hasta el límite del contrato.

import type { SupabaseClient } from "@supabase/supabase-js";
import { inicioDelDiaLocal } from "@/lib/format";

export type EstadoKm = "ok" | "aviso" | "excedido" | "sin_datos" | "sin_configurar";

export type KmAlquilado = {
  id: string;
  nombre: string;
  patente: string;
  empresa: string | null;
  desde: string | null; // "YYYY-MM-DD"
  limite: number;
  aviso: number;
  kmInicio: number | null;
  /** De dónde sale el km de inicio. */
  origenInicio: "cargado" | "primera_carga" | null;
  kmActual: number | null;
  ultimaCarga: string | null; // ISO
  recorridos: number | null;
  restantes: number | null;
  estado: EstadoKm;
};

const LIMITE_DEF = 5000;
const AVISO_DEF = 500;

/** Calcula el estado a partir de los datos (sin consultar la base). */
export function calcularKm(v: {
  desde: string | null;
  limite: number | null;
  aviso: number | null;
  kmInicial: number | null;
  primeraDesde: number | null;
  actual: number | null;
}) {
  const limite = v.limite && v.limite > 0 ? v.limite : LIMITE_DEF;
  const aviso = v.aviso != null && v.aviso >= 0 ? v.aviso : AVISO_DEF;
  if (!v.desde)
    return { limite, aviso, kmInicio: null, origenInicio: null, recorridos: null, restantes: null, estado: "sin_configurar" as EstadoKm };
  const kmInicio = v.kmInicial ?? v.primeraDesde;
  const origenInicio = v.kmInicial != null ? ("cargado" as const) : v.primeraDesde != null ? ("primera_carga" as const) : null;
  if (kmInicio == null || v.actual == null)
    return { limite, aviso, kmInicio, origenInicio, recorridos: null, restantes: null, estado: "sin_datos" as EstadoKm };
  const recorridos = Math.max(0, v.actual - kmInicio);
  const restantes = limite - recorridos;
  const estado: EstadoKm = restantes <= 0 ? "excedido" : restantes <= aviso ? "aviso" : "ok";
  return { limite, aviso, kmInicio, origenInicio, recorridos, restantes, estado };
}

/**
 * Vehículos alquilados activos con su control de km. Devuelve null si
 * todavía no se corrió el SQL (faltan las columnas).
 */
export async function traerKmAlquilados(supabase: SupabaseClient): Promise<KmAlquilado[] | null> {
  const { data: vs, error } = await supabase
    .from("vehiculos")
    .select("id, nombre, patente, km_control_desde, km_limite, km_aviso, km_inicial, empresas(nombre)")
    .eq("es_alquilado", true)
    .eq("activo", true)
    .order("nombre");
  if (error) return null;

  return Promise.all(
    (vs || []).map(async (v: any): Promise<KmAlquilado> => {
      let primeraDesde: number | null = null;
      let actual: number | null = null;
      let ultimaCarga: string | null = null;
      if (v.km_control_desde) {
        const desdeIso = inicioDelDiaLocal(v.km_control_desde).toISOString();
        const base = () =>
          supabase
            .from("cargas")
            .select("odometro_km, registrado_en")
            .eq("vehiculo_id", v.id)
            .is("anulada_en", null)
            .gte("registrado_en", desdeIso);
        const [{ data: pri }, { data: ult }, { data: ultFecha }] = await Promise.all([
          base().order("odometro_km", { ascending: true }).limit(1).maybeSingle(),
          base().order("odometro_km", { ascending: false }).limit(1).maybeSingle(),
          base().order("registrado_en", { ascending: false }).limit(1).maybeSingle(),
        ]);
        primeraDesde = pri ? Number(pri.odometro_km) : null;
        actual = ult ? Number(ult.odometro_km) : null;
        ultimaCarga = ultFecha?.registrado_en ?? null;
      }
      const c = calcularKm({
        desde: v.km_control_desde ?? null,
        limite: v.km_limite ?? null,
        aviso: v.km_aviso ?? null,
        kmInicial: v.km_inicial != null ? Number(v.km_inicial) : null,
        primeraDesde,
        actual,
      });
      return {
        id: v.id,
        nombre: v.nombre,
        patente: v.patente,
        empresa: v.empresas?.nombre ?? null,
        desde: v.km_control_desde ?? null,
        kmActual: actual,
        ultimaCarga,
        ...c,
      };
    }),
  );
}
