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
