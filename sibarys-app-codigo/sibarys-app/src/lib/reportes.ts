// Cálculos del módulo de reportes. Todo trabaja sobre una lista de cargas ya
// "planas" (con los datos del vehículo, estación, etc.) y se filtra en el
// navegador, así los filtros responden al instante.

import { hoyLocal } from "@/lib/format";

/** Una carga con todo lo que necesitan los reportes. */
export type FilaReporte = {
  id: string;
  fecha: string; // "YYYY-MM-DD" en hora de Paraguay
  registrado_en: string; // ISO
  vehiculo_id: string;
  vehiculo: string; // "045"
  patente: string;
  modelo: string; // "Hyundai H1"
  tanque: number | null;
  ref_l100: number | null;
  alquilado: boolean;
  empresa: string | null; // empresa de alquiler
  chofer_id: string;
  chofer: string;
  combustible: string;
  estacion: string; // "Sin estación" si no tiene
  emblema: string; // "Sin estación" si no tiene
  litros: number;
  gasto: number;
  km: number; // odómetro
  recorrido: number | null; // km desde la carga anterior del vehículo
  tanque_lleno: boolean;
};

export type Filtros = {
  desde: string; // "YYYY-MM-DD"
  hasta: string;
  vehiculo: string;
  modelo: string;
  chofer: string;
  combustible: string;
  emblema: string;
  estacion: string;
  propiedad: "" | "propios" | "alquilados";
};

export const FILTROS_VACIOS: Omit<Filtros, "desde" | "hasta"> = {
  vehiculo: "",
  modelo: "",
  chofer: "",
  combustible: "",
  emblema: "",
  estacion: "",
  propiedad: "",
};

// ---------------------------------------------------------------- fechas

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(ymd: string, dias: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  return (
    Math.round(
      (new Date(`${hasta}T12:00:00Z`).getTime() -
        new Date(`${desde}T12:00:00Z`).getTime()) /
        86400000
    ) + 1
  );
}

export type Periodo = {
  clave: string;
  label: string;
  rango: () => { desde: string; hasta: string };
};

export const PERIODOS: Periodo[] = [
  {
    clave: "7d",
    label: "Últimos 7 días",
    rango: () => ({ desde: sumarDias(hoyLocal(), -6), hasta: hoyLocal() }),
  },
  {
    clave: "30d",
    label: "Últimos 30 días",
    rango: () => ({ desde: sumarDias(hoyLocal(), -29), hasta: hoyLocal() }),
  },
  {
    clave: "mes",
    label: "Este mes",
    rango: () => ({ desde: hoyLocal().slice(0, 8) + "01", hasta: hoyLocal() }),
  },
  {
    clave: "mes_ant",
    label: "Mes anterior",
    rango: () => {
      const primero = hoyLocal().slice(0, 8) + "01";
      const finAnt = sumarDias(primero, -1);
      return { desde: finAnt.slice(0, 8) + "01", hasta: finAnt };
    },
  },
  {
    clave: "anio",
    label: "Este año",
    rango: () => ({ desde: hoyLocal().slice(0, 4) + "-01-01", hasta: hoyLocal() }),
  },
];

// ---------------------------------------------------------------- filtros

export function aplicarFiltros(
  filas: FilaReporte[],
  f: Filtros,
  conFechas = true
): FilaReporte[] {
  return filas.filter(
    (r) =>
      (!conFechas || (r.fecha >= f.desde && r.fecha <= f.hasta)) &&
      (!f.vehiculo || r.vehiculo_id === f.vehiculo) &&
      (!f.modelo || r.modelo === f.modelo) &&
      (!f.chofer || r.chofer_id === f.chofer) &&
      (!f.combustible || r.combustible === f.combustible) &&
      (!f.emblema || r.emblema === f.emblema) &&
      (!f.estacion || r.estacion === f.estacion) &&
      (!f.propiedad ||
        (f.propiedad === "alquilados" ? r.alquilado : !r.alquilado))
  );
}

// ---------------------------------------------------------------- totales

export type Totales = {
  cargas: number;
  litros: number;
  gasto: number;
  km: number; // km recorridos (suma de tramos entre cargas)
  costoKm: number | null; // ₲ por km
  l100: number | null; // consumo del periodo, L/100 km
  vehiculos: number;
};

/**
 * Totales de un conjunto de cargas.
 * El consumo y el costo por km usan solo las cargas que tienen tramo
 * (recorrido desde la carga anterior): esos litros son los que se gastaron
 * en esos km. Con cargas parciales cada tramo es impreciso, pero sumados en
 * un periodo los errores se compensan.
 */
export function totales(filas: FilaReporte[]): Totales {
  let litros = 0,
    gasto = 0,
    km = 0,
    litrosTramo = 0,
    gastoTramo = 0;
  const veh = new Set<string>();
  for (const r of filas) {
    litros += r.litros;
    gasto += r.gasto;
    veh.add(r.vehiculo_id);
    if (r.recorrido != null && r.recorrido > 0) {
      km += r.recorrido;
      litrosTramo += r.litros;
      gastoTramo += r.gasto;
    }
  }
  return {
    cargas: filas.length,
    litros,
    gasto,
    km,
    costoKm: km > 0 ? gastoTramo / km : null,
    l100: km > 0 ? (litrosTramo / km) * 100 : null,
    vehiculos: veh.size,
  };
}

/** Variación porcentual (null si no hay base para comparar). */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

// ---------------------------------------------------------------- tiempo

export type Agrupacion = "dia" | "semana" | "mes";

/** Lunes de la semana de una fecha "YYYY-MM-DD". */
function lunes(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return sumarDias(ymd, -dow);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function agrupacionSugerida(desde: string, hasta: string): Agrupacion {
  const dias = diasEntre(desde, hasta);
  if (dias <= 31) return "dia";
  if (dias <= 120) return "semana";
  return "mes";
}

export type PuntoTiempo = { clave: string; label: string; gasto: number; litros: number; cargas: number };

/** Serie de tiempo completa (incluye los días/semanas/meses sin cargas). */
export function serieTiempo(
  filas: FilaReporte[],
  desde: string,
  hasta: string,
  ag: Agrupacion
): PuntoTiempo[] {
  const claveDe = (ymd: string) =>
    ag === "dia" ? ymd : ag === "semana" ? lunes(ymd) : ymd.slice(0, 7);
  const labelDe = (clave: string) => {
    if (ag === "mes") return `${MESES[Number(clave.slice(5, 7)) - 1]} ${clave.slice(2, 4)}`;
    return `${clave.slice(8, 10)}/${clave.slice(5, 7)}`;
  };

  const mapa = new Map<string, PuntoTiempo>();
  // Todos los periodos del rango, aunque no tengan cargas
  let cur = desde;
  while (cur <= hasta) {
    const k = claveDe(cur);
    if (!mapa.has(k)) mapa.set(k, { clave: k, label: labelDe(k), gasto: 0, litros: 0, cargas: 0 });
    cur = sumarDias(cur, 1);
  }
  for (const r of filas) {
    const p = mapa.get(claveDe(r.fecha));
    if (!p) continue;
    p.gasto += r.gasto;
    p.litros += r.litros;
    p.cargas += 1;
  }
  return Array.from(mapa.values()).sort((a, b) => a.clave.localeCompare(b.clave));
}

// ---------------------------------------------------------------- rankings

export type Semaforo = "ok" | "atencion" | "alto" | "sin_datos";

export type FilaRanking = Totales & {
  clave: string;
  nombre: string;
  detalle?: string;
  ref_l100?: number | null;
  semaforo?: Semaforo;
  precioLitro: number | null;
};

/** Semáforo de consumo contra la referencia del vehículo. */
export function semaforo(
  l100: number | null,
  ref: number | null | undefined,
  litrosTramo: number,
  tanque: number | null | undefined
): Semaforo {
  if (l100 == null || !ref) return "sin_datos";
  // Hace falta haber cargado al menos ~2 tanques para que el dato sea confiable
  const minimo = (tanque && tanque > 0 ? tanque : 60) * 2;
  if (litrosTramo < minimo) return "sin_datos";
  if (l100 <= ref * 1.1) return "ok";
  if (l100 <= ref * 1.25) return "atencion";
  return "alto";
}

export function agruparPor(
  filas: FilaReporte[],
  clave: (r: FilaReporte) => string,
  nombre: (r: FilaReporte) => string,
  detalle?: (r: FilaReporte) => string | undefined
): FilaRanking[] {
  const grupos = new Map<string, FilaReporte[]>();
  for (const r of filas) {
    const k = clave(r);
    const g = grupos.get(k);
    if (g) g.push(r);
    else grupos.set(k, [r]);
  }
  return Array.from(grupos.entries()).map(([k, g]) => {
    const t = totales(g);
    return {
      ...t,
      clave: k,
      nombre: nombre(g[0]),
      detalle: detalle?.(g[0]),
      precioLitro: t.litros > 0 ? t.gasto / t.litros : null,
    };
  });
}

/** Ranking de vehículos con su semáforo de consumo. */
export function rankingVehiculos(filas: FilaReporte[]): FilaRanking[] {
  const base = agruparPor(
    filas,
    (r) => r.vehiculo_id,
    (r) => r.vehiculo,
    (r) => `${r.patente} · ${r.modelo}${r.alquilado ? ` · ${r.empresa ?? "Alquilado"}` : ""}`
  );
  return base.map((v) => {
    const g = filas.filter((r) => r.vehiculo_id === v.clave);
    const litrosTramo = g
      .filter((r) => r.recorrido != null && r.recorrido > 0)
      .reduce((s, r) => s + r.litros, 0);
    return {
      ...v,
      ref_l100: g[0].ref_l100,
      semaforo: semaforo(v.l100, g[0].ref_l100, litrosTramo, g[0].tanque),
    };
  });
}

export type Orden = "gasto" | "litros" | "km" | "costoKm" | "l100" | "cargas";

export function ordenar(filas: FilaRanking[], orden: Orden): FilaRanking[] {
  return [...filas].sort((a, b) => {
    const va = a[orden] ?? -1;
    const vb = b[orden] ?? -1;
    return (vb as number) - (va as number);
  });
}
