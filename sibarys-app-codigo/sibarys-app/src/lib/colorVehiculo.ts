// Color estable por vehículo para su "avatar" en las listas (solo presentación).
const TONOS = [
  "bg-brand-suave text-brand-dark",
  "bg-oro-suave text-oro-dark",
  "bg-ok-suave text-ok",
  "bg-neutro-suave text-tinta",
  "bg-alerta-suave text-alerta",
  "bg-tinta text-white",
];

export function colorVehiculo(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

/** Texto corto del avatar: los últimos 3 caracteres de la patente. */
export function sigla(patente: string | null | undefined): string {
  return (patente || "").replace(/\s/g, "").slice(-3).toUpperCase() || "—";
}
