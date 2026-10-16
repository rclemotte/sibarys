"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ComposedChart, Line, ReferenceLine, Scatter } from "recharts";
import type { FilaReporte, PuntoTiempo } from "@/lib/reportes";

/** Número corto para ejes: 41.582.627 -> "41,6 M". */
export function abreviar(n: number): string {
  if (Math.abs(n) >= 1e5)
    return `${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1e3)
    return `${(n / 1e3).toLocaleString("es-AR", { maximumFractionDigits: 0 })} mil`;
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

/** Gasto o litros en el tiempo: una sola serie, barras. */
export function TiempoChart({
  data,
  metrica,
}: {
  data: PuntoTiempo[];
  metrica: "gasto" | "litros";
}) {
  if (data.every((p) => p[metrica] === 0))
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Sin cargas en este periodo.
      </p>
    );
  const fmt = (v: number) =>
    metrica === "gasto"
      ? `₲ ${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
      : `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} L`;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => abreviar(v)}
        />
        <Tooltip
          cursor={{ fill: "rgba(15,118,110,0.08)" }}
          formatter={(v: number, _n, item: any) => [
            fmt(v),
            `${metrica === "gasto" ? "Gasto" : "Litros"} · ${item.payload.cargas} carga(s)`,
          ]}
          labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          contentStyle={{
            borderRadius: 12,
            fontSize: 12,
            borderColor: "#e2e8f0",
          }}
        />
        <Bar
          dataKey={metrica}
          fill="#0f766e"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- consumo

export type PuntoConsumo = {
  t: number; // fecha/hora en ms
  l100: number;
  vehiculo_id: string;
  vehiculo: string;
  patente: string;
  modelo: string;
  chofer: string;
  recorrido: number;
  litros: number;
  ref: number | null;
  fecha: string; // "DD/MM HH:mm"
};

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Asuncion",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Un punto por carga con tramo (km desde la carga anterior del vehículo). */
export function puntosConsumo(filas: FilaReporte[]): PuntoConsumo[] {
  return filas
    .filter((r) => r.recorrido != null && r.recorrido > 0 && r.litros > 0)
    .map((r) => {
      const l100 = (r.litros / (r.recorrido as number)) * 100;
      return {
        t: new Date(r.registrado_en).getTime(),
        l100: Math.round(l100 * 10) / 10,
        vehiculo_id: r.vehiculo_id,
        vehiculo: r.vehiculo,
        patente: r.patente,
        modelo: r.modelo,
        chofer: r.chofer,
        recorrido: r.recorrido as number,
        litros: r.litros,
        ref: r.ref_l100,
        fecha: fmtFechaHora(r.registrado_en),
      };
    })
    .sort((a, b) => a.t - b.t);
}

function TooltipConsumo({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: PuntoConsumo = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">
        {p.vehiculo}{" "}
        <span className="font-normal text-slate-400">· {p.patente}</span>
      </p>
      <p className="text-slate-400">{p.modelo}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {p.l100.toLocaleString("es-AR")} L/100 km
      </p>
      {p.ref != null ? (
        <p className="text-slate-500">
          Referencia del vehículo: {p.ref.toLocaleString("es-AR")}
        </p>
      ) : null}
      <p className="mt-1 text-slate-500">
        {p.litros.toLocaleString("es-AR", { maximumFractionDigits: 2 })} L en{" "}
        {p.recorrido.toLocaleString("es-AR", { maximumFractionDigits: 0 })} km
      </p>
      <p className="text-slate-500">{p.chofer}</p>
      <p className="text-slate-400">{p.fecha}</p>
    </div>
  );
}

/**
 * Consumo de cada carga en el tiempo. Con todos los vehículos: puntos
 * sueltos (no se unen cargas de vehículos distintos). Con un solo vehículo:
 * puntos unidos por línea y su referencia punteada.
 */
export function ConsumoChart({
  puntos,
  unVehiculo,
}: {
  puntos: PuntoConsumo[];
  unVehiculo: boolean;
}) {
  if (puntos.length === 0)
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Sin cargas con recorrido en este periodo.
      </p>
    );
  const ref = unVehiculo
    ? (puntos.find((p) => p.ref != null)?.ref ?? null)
    : null;
  const tMin = puntos[0].t;
  const tMax = puntos[puntos.length - 1].t;
  const margen = Math.max((tMax - tMin) * 0.03, 3600000);
  // Una marca por día (a la medianoche de Paraguay); si son muchos días, cada N
  const DIA = 86400000;
  const OFFSET = 3 * 3600000; // UTC-3
  const primerDia = Math.ceil((tMin - margen + OFFSET) / DIA) * DIA - OFFSET;
  const dias = Math.max(1, Math.round((tMax - tMin) / DIA));
  const paso = Math.max(1, Math.ceil(dias / 8));
  const ticks: number[] = [];
  for (let t = primerDia; t <= tMax + margen; t += DIA * paso) ticks.push(t);
  const fmtEje = (t: number) =>
    new Date(t).toLocaleDateString("es-AR", {
      timeZone: "America/Asuncion",
      day: "2-digit",
      month: "2-digit",
    });

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={puntos}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[tMin - margen, tMax + margen]}
            ticks={ticks}
            tickFormatter={fmtEje}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            minTickGap={24}
          />
          <YAxis
            dataKey="l100"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={<TooltipConsumo />}
            cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
          />
          {ref != null ? (
            <ReferenceLine
              y={ref}
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{
                value: `Referencia ${ref.toLocaleString("es-AR")}`,
                position: "insideTopRight",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
          ) : null}
          {unVehiculo ? (
            <Line
              dataKey="l100"
              stroke="#0f766e"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Scatter
            data={puntos}
            dataKey="l100"
            fill="#0f766e"
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0f766e]" />{" "}
          Carga
        </span>
        {ref != null ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-slate-500" />{" "}
            Referencia
          </span>
        ) : null}
      </div>
    </div>
  );
}
