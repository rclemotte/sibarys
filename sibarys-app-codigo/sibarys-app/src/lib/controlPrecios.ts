// Control de precios: compara lo que pagó cada carga por litro con el precio
// de referencia que carga administración para ese emblema y combustible,
// vigente en la fecha de la carga.

import { hoyLocal } from "@/lib/format";
import type { FilaExport } from "@/lib/exportCargas";

export type PrecioRef = {
  emblema_id: string;
  tipo_combustible_id: string;
  precio: number;
  vigente_desde: string; // "YYYY-MM-DD"
};

export type FilaControl = FilaExport & {
  pagado: number | null; // ₲ por litro que pagó
  referencia: number | null; // ₲ por litro de referencia
  referenciaDesde: string | null;
  difPct: number | null; // % pagado de más (+) o de menos (-)
  difGs: number | null; // diferencia total de la carga en ₲
  motivoSinControl: "sin_emblema" | "sin_precio" | null;
};

export function controlarPrecios(filas: FilaExport[], precios: PrecioRef[]): FilaControl[] {
  // Precios por emblema+combustible, del más nuevo al más viejo
  const porClave = new Map<string, PrecioRef[]>();
  for (const p of precios) {
    const k = `${p.emblema_id}|${p.tipo_combustible_id}`;
    porClave.set(k, [...(porClave.get(k) || []), p]);
  }
  porClave.forEach((l) => l.sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde)));

  return filas.map((r) => {
    const litros = Number(r.litros) || 0;
    const pagado =
      r.precio_litro != null && Number(r.precio_litro) > 0
        ? Number(r.precio_litro)
        : litros > 0 && r.costo_total
          ? Number(r.costo_total) / litros
          : null;
    const base = { ...r, pagado, referencia: null, referenciaDesde: null, difPct: null, difGs: null };
    if (!r.emblema_id) return { ...base, motivoSinControl: "sin_emblema" as const };
    const fecha = hoyLocal(new Date(r.registrado_en));
    const ref = (porClave.get(`${r.emblema_id}|${r.tipo_combustible_id}`) || []).find(
      (p) => p.vigente_desde <= fecha,
    );
    if (!ref || pagado == null) return { ...base, motivoSinControl: "sin_precio" as const };
    const refPrecio = Number(ref.precio);
    return {
      ...base,
      referencia: refPrecio,
      referenciaDesde: ref.vigente_desde,
      difPct: ((pagado - refPrecio) / refPrecio) * 100,
      difGs: (pagado - refPrecio) * litros,
      motivoSinControl: null,
    };
  });
}
