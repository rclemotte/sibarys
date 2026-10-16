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
import type { PuntoTiempo } from "@/lib/reportes";

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
