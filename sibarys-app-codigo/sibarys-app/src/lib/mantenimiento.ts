// Mantenimiento de vehículos: cuánto falta para el próximo y su estado.

/** Se avisa cuando faltan esta cantidad de km o menos. */
export const AVISO_KM = 800;

/** Intervalo sugerido para proponer el km del próximo mantenimiento. */
export const INTERVALO_SUGERIDO_KM = 10000;

export type EstadoMant = "vencido" | "proximo" | "al_dia" | "sin_registro";

export type FilaMantenimiento = {
  vehiculo_id: string;
  nombre: string;
  patente: string;
  activo: boolean;
  km_actual: number | null;
  ultimo_fecha: string | null;
  ultimo_km: number | null;
  km_proximo: number | null;
  ultimo_descripcion: string | null;
};

export type FilaConEstado = FilaMantenimiento & {
  estado: EstadoMant;
  faltan: number | null; // km que faltan (negativo si ya se pasó)
};

export function estadoDe(f: FilaMantenimiento): FilaConEstado {
  if (f.km_proximo == null)
    return { ...f, estado: "sin_registro", faltan: null };
  // Sin cargas todavía: tomamos el km del último mantenimiento
  const actual = f.km_actual ?? f.ultimo_km ?? 0;
  const faltan = Number(f.km_proximo) - Number(actual);
  const estado: EstadoMant =
    faltan <= 0 ? "vencido" : faltan <= AVISO_KM ? "proximo" : "al_dia";
  return { ...f, estado, faltan };
}

const ORDEN: Record<EstadoMant, number> = {
  vencido: 0,
  proximo: 1,
  al_dia: 2,
  sin_registro: 3,
};

/** Vencidos primero, después próximos, al día (por km que faltan) y sin registro. */
export function ordenarPorUrgencia(filas: FilaConEstado[]): FilaConEstado[] {
  return [...filas].sort((a, b) => {
    if (ORDEN[a.estado] !== ORDEN[b.estado])
      return ORDEN[a.estado] - ORDEN[b.estado];
    if (a.faltan != null && b.faltan != null) return a.faltan - b.faltan;
    return a.nombre.localeCompare(b.nombre, "es", { numeric: true });
  });
}
