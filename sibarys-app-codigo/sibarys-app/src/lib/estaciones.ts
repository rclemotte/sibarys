import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Texto de la estación que se guarda junto a la carga (campo "estacion"),
 * ej. "GABANA S.A. (Enex) · Luque". Lo leen Historial, Reportes y Exportar.
 */
export async function textoEstacion(
  supabase: SupabaseClient,
  estacionId: string | null
): Promise<string | null> {
  if (!estacionId) return null;
  const { data: est } = await supabase
    .from("estaciones_servicio")
    .select("nombre, localidad, emblemas(nombre)")
    .eq("id", estacionId)
    .maybeSingle();
  if (!est) return null;
  const emblema = (est as any).emblemas?.nombre as string | undefined;
  return (
    `${est.nombre}` +
    (emblema ? ` (${emblema})` : "") +
    (est.localidad ? ` · ${est.localidad}` : "")
  );
}
