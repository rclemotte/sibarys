export type Tono = "ok" | "alerta" | "error" | "neutro" | "marca" | "oro";

export const TONOS: Record<Tono, string> = {
  ok: "bg-ok-suave text-ok",
  alerta: "bg-alerta-suave text-alerta",
  error: "bg-error-suave text-error",
  neutro: "bg-neutro-suave text-suave",
  marca: "bg-brand-suave text-brand-dark",
  oro: "bg-oro-suave text-oro-dark",
};

/** Badge de estado en forma de píldora. */
export default function Etiqueta({ tono = "neutro", children }: { tono?: Tono; children: React.ReactNode }) {
  return <span className={`etiqueta ${TONOS[tono]}`}>{children}</span>;
}
