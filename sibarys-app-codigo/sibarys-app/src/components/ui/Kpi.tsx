/** Tarjeta de KPI: número grande con unidad, etiqueta con punto de color. */
export default function Kpi({
  etiqueta,
  valor,
  unidad,
  punto = "bg-brand",
  ayuda,
  variacion,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  punto?: string;
  ayuda?: string;
  /** Variación vs. el período anterior, en % (positivo = subió) */
  variacion?: { pct: number; bueno: "sube" | "baja" | "neutro" } | null;
}) {
  let varTxt: React.ReactNode = null;
  if (variacion && Number.isFinite(variacion.pct)) {
    const sube = variacion.pct > 0;
    const bien = variacion.bueno === "sube" ? sube : !sube;
    const clase =
      variacion.bueno === "neutro" ? "bg-neutro-suave text-suave" : bien ? "bg-ok-suave text-ok" : "bg-alerta-suave text-alerta";
    varTxt = (
      <span className={`etiqueta ${clase}`} title="Comparado con los mismos días del mes anterior">
        {sube ? "▲" : "▼"} {Math.abs(variacion.pct).toLocaleString("es-AR", { maximumFractionDigits: 0 })}%
      </span>
    );
  }
  return (
    <div className="rounded-tarjeta bg-white p-4 shadow-suave lg:p-5">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-suave">
        <span className={`h-2 w-2 rounded-full ${punto}`} aria-hidden="true" />
        {etiqueta}
      </p>
      <p className="mt-1 font-display text-[26px] font-extrabold leading-none text-tinta lg:text-3xl">
        {valor}
        {unidad ? <span className="ml-1 text-base font-bold text-suave">{unidad}</span> : null}
      </p>
      <div className="mt-1.5 flex min-h-[20px] items-center gap-2">
        {varTxt}
        {ayuda ? <span className="text-xs font-semibold text-tenue">{ayuda}</span> : null}
      </div>
    </div>
  );
}
