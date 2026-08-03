"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type TrendPoint = { label: string; kmPerLiter: number };
export type VehicleBar = { name: string; liters: number; avgKmL: number | null };

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Sin datos suficientes para graficar.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => [`${v} km/l`, "Consumo"]}
          contentStyle={{ borderRadius: 12, fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="kmPerLiter"
          stroke="#0f766e"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VehicleLitersChart({ data }: { data: VehicleBar[] }) {
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-slate-400">Sin datos.</p>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(v: number) => [`${v} L`, "Litros"]}
          contentStyle={{ borderRadius: 12, fontSize: 12 }}
        />
        <Bar dataKey="liters" fill="#14b8a6" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
