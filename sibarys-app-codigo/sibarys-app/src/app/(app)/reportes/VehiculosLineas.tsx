"use client";

import type { FilaRanking, Semaforo } from "@/lib/reportes";
import type { PuntoConsumo } from "./Charts";

// Alto (px) de cada mini gráfico y tope de la escala compartida
const ALTO = 48;
const ANCHO = 300; // ancho lógico del SVG (se estira al ancho disponible)

const ESTADO: Record<
  Semaforo,
  { label: string; icono: string; clase: string }
> = {
  alto: { label: "Alto", icono: "▲", clase: "bg-red-50 text-red-800" },
  atencion: {
    label: "Atención",
    icono: "!",
    clase: "bg-amber-50 text-amber-800",
  },
  ok: { label: "Normal", icono: "✓", clase: "bg-emerald-50 text-emerald-800" },
  sin_datos: {
    label: "Pocos datos",
    icono: "…",
    clase: "bg-slate-100 text-slate-500",
  },
};
const ORDEN_ESTADO: Record<Semaforo, number> = {
  alto: 0,
  atencion: 1,
  ok: 2,
  sin_datos: 3,
};

const num = (n: number, d = 1) =>
  n.toLocaleString("es-AR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });

/**
 * Una fila por vehículo: nombre, su línea de consumo por carga en el periodo
 * (todas con la misma escala, para poder comparar) y su promedio contra la
 * referencia. Tocar una fila filtra ese vehículo.
 */
export default function VehiculosLineas({
  puntos,
  vehiculos,
  desdeMs,
  hastaMs,
  onElegir,
}: {
  puntos: PuntoConsumo[];
  vehiculos: FilaRanking[]; // ranking de vehículos (promedio y estado del periodo)
  desdeMs: number;
  hastaMs: number;
  onElegir: (vehiculoId: string) => void;
}) {
  // Puntos por vehículo
  const porVeh = new Map<string, PuntoConsumo[]>();
  for (const p of puntos) {
    const l = porVeh.get(p.vehiculo_id) || [];
    l.push(p);
    porVeh.set(p.vehiculo_id, l);
  }

  // Escala compartida: hasta el mayor valor "normal", con tope para que un
  // dato raro no aplaste al resto (lo que pasa el tope se marca arriba)
  const valores = puntos.map((p) => p.l100).sort((a, b) => a - b);
  const p95 = valores.length ? valores[Math.floor(valores.length * 0.95)] : 20;
  const refMax = Math.max(0, ...vehiculos.map((v) => v.ref_l100 ?? 0));
  const yMax = Math.ceil(Math.max(p95, refMax * 1.3, 10) / 5) * 5;
  const p5 = valores.length ? valores[Math.floor(valores.length * 0.05)] : 0;
  const yMin = Math.max(0, Math.floor(p5 / 5) * 5);

  const x = (t: number) =>
    ((t - desdeMs) / Math.max(1, hastaMs - desdeMs)) * ANCHO;
  const y = (v: number) =>
    ALTO -
    3 -
    ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * (ALTO - 6);

  const sinTramo = vehiculos.filter((v) => !porVeh.has(v.clave));
  const filas = vehiculos
    .filter((v) => porVeh.has(v.clave))
    .sort((a, b) => {
      const ea = ORDEN_ESTADO[a.semaforo ?? "sin_datos"];
      const eb = ORDEN_ESTADO[b.semaforo ?? "sin_datos"];
      if (ea !== eb) return ea - eb;
      const ra = a.l100 != null && a.ref_l100 ? a.l100 / a.ref_l100 : 0;
      const rb = b.l100 != null && b.ref_l100 ? b.l100 / b.ref_l100 : 0;
      return rb - ra;
    });

  const fmtDia = (ms: number) =>
    new Date(ms).toLocaleDateString("es-AR", {
      timeZone: "America/Asuncion",
      day: "2-digit",
      month: "2-digit",
    });

  return (
    <div>
      {/* Encabezado con fechas, alineado con la columna de las líneas */}
      <div className="mb-1 flex items-center gap-3 text-[10px] text-slate-400">
        <div className="w-24 shrink-0 sm:w-32">Vehículo</div>
        <div className="flex flex-1 justify-between">
          <span>{fmtDia(desdeMs)}</span>
          <span>{fmtDia((desdeMs + hastaMs) / 2)}</span>
          <span>{fmtDia(hastaMs - 1)}</span>
        </div>
        <div className="w-[5.5rem] shrink-0 text-right">Prom. / ref.</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {filas.map((v) => {
          const pts = (porVeh.get(v.clave) || []).sort((a, b) => a.t - b.t);
          const est = ESTADO[v.semaforo ?? "sin_datos"];
          const camino = pts
            .map(
              (p, i) =>
                `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.l100).toFixed(1)}`,
            )
            .join(" ");
          return (
            <li key={v.clave}>
              <button
                type="button"
                onClick={() => onElegir(v.clave)}
                className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50"
              >
                <div className="w-24 shrink-0 sm:w-32">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {v.nombre}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {v.detalle?.split(" · ")[0]}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  {pts.length === 0 ? (
                    <p className="text-[11px] text-slate-300">
                      Sin tramos en el periodo
                    </p>
                  ) : (
                    <svg
                      viewBox={`0 0 ${ANCHO} ${ALTO}`}
                      preserveAspectRatio="none"
                      className="block h-12 w-full"
                      role="img"
                      aria-label={`Consumo de ${v.nombre}`}
                    >
                      {v.ref_l100 ? (
                        <line
                          x1={0}
                          x2={ANCHO}
                          y1={y(v.ref_l100)}
                          y2={y(v.ref_l100)}
                          stroke="#94a3b8"
                          strokeDasharray="4 3"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : null}
                      {pts.length > 1 ? (
                        <path
                          d={camino}
                          fill="none"
                          stroke="#0f766e"
                          strokeWidth={2}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : null}
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={x(p.t)}
                          cy={y(p.l100)}
                          r={2.6}
                          fill={
                            p.l100 > yMax || p.l100 < yMin
                              ? "#b91c1c"
                              : "#0f766e"
                          }
                          vectorEffect="non-scaling-stroke"
                        >
                          <title>{`${p.fecha} · ${num(p.l100)} L/100 km · ${p.chofer}`}</title>
                        </circle>
                      ))}
                    </svg>
                  )}
                </div>

                <div className="w-[5.5rem] shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {v.l100 != null ? num(v.l100) : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ref. {v.ref_l100 != null ? num(v.ref_l100) : "—"}
                  </p>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold ${est.clase}`}
                  >
                    <span aria-hidden="true">{est.icono}</span>
                    {est.label}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {sinTramo.length > 0 ? (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Con una sola carga en el periodo (todavía sin tramo para medir):{" "}
          {sinTramo
            .map((v) => v.nombre)
            .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
            .join(", ")}
          .
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Cada línea es el consumo (L/100 km) de cada carga del vehículo; la línea
        punteada es su referencia. Todas usan la misma escala ({yMin} a {yMax});
        un punto rojo es un valor que se sale de esa escala. El promedio y el
        estado son del periodo completo. Tocá un vehículo para ver el detalle.
      </p>
    </div>
  );
}
