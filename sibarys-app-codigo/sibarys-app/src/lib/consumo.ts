// Consumo de combustible: la app trabaja en LITROS CADA 100 KM (L/100 km),
// que es como lo maneja el cliente. Menos es mejor.

/**
 * Consumo de referencia de un vehículo en L/100 km.
 * Usa consumo_ref_l100km; si esa columna todavía no existe en la base
 * (migración sin correr), convierte el valor viejo en km/l.
 */
export function referenciaL100(v: {
  consumo_ref_l100km?: number | string | null;
  consumo_promedio_asignado?: number | string | null;
}): number | null {
  if (v.consumo_ref_l100km !== undefined) {
    const n = v.consumo_ref_l100km == null ? null : Number(v.consumo_ref_l100km);
    return n != null && n > 0 ? n : null;
  }
  const kml =
    v.consumo_promedio_asignado == null ? null : Number(v.consumo_promedio_asignado);
  return kml != null && kml > 0 ? Math.round((100 / kml) * 100) / 100 : null;
}

/** Margen sobre la capacidad del tanque (boca de carga, manguera, etc.). */
export const MARGEN_TANQUE = 0.1;

/**
 * Controla que los litros de una carga no superen lo que le entra al tanque
 * (+10%). Devuelve el mensaje de error, o null si está bien o si el vehículo
 * no tiene la capacidad cargada.
 */
export function errorLitrosTanque(
  litros: number,
  vehiculo: { nombre?: string | null; capacidad_tanque_litros?: number | string | null }
): string | null {
  const cap =
    vehiculo.capacidad_tanque_litros == null
      ? null
      : Number(vehiculo.capacidad_tanque_litros);
  if (cap == null || !(cap > 0)) return null;
  const maximo = Math.round(cap * (1 + MARGEN_TANQUE) * 100) / 100;
  if (litros <= maximo) return null;
  const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `Cargaste ${fmt(litros)} litros, pero el tanque del ${
    vehiculo.nombre ?? "vehículo"
  } es de ${fmt(cap)} L (máximo permitido ${fmt(maximo)} L). Revisá el dato del ticket.`;
}
