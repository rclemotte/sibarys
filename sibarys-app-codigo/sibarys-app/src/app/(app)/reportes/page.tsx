import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import { fmtNumber, ZONA_HORARIA } from "@/lib/format";
import { TrendChart, VehicleLitersChart } from "./Charts";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const supabase = createClient();

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 6);

  const { data } = await supabase
    .from("consumo")
    .select("*")
    .gte("registrado_en", desde.toISOString())
    .order("registrado_en", { ascending: true });

  const cargas = (data || []) as Consumo[];

  // Tendencia de consumo (L/100 km) en el tiempo
  const trend = cargas
    .filter((r) => r.litros_por_100km != null)
    .map((r) => ({
      label: new Date(r.registrado_en).toLocaleDateString("es-AR", {
        timeZone: ZONA_HORARIA,
        day: "2-digit",
        month: "2-digit",
      }),
      l100: Number(r.litros_por_100km),
    }));

  // Agregado por vehículo
  const porVehiculo = new Map<
    string,
    { name: string; liters: number; l100Sum: number; l100Count: number }
  >();
  for (const r of cargas) {
    const key = r.vehiculo_id;
    const cur =
      porVehiculo.get(key) || {
        name: r.vehiculo_nombre,
        liters: 0,
        l100Sum: 0,
        l100Count: 0,
      };
    cur.liters += Number(r.litros);
    if (r.litros_por_100km != null) {
      cur.l100Sum += Number(r.litros_por_100km);
      cur.l100Count += 1;
    }
    porVehiculo.set(key, cur);
  }

  const vehicleBars = Array.from(porVehiculo.values())
    .map((v) => ({
      name: v.name,
      liters: Math.round(v.liters),
      avgL100: v.l100Count > 0 ? v.l100Sum / v.l100Count : null,
    }))
    .sort((a, b) => b.liters - a.liters);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Reportes</h1>
        <p className="text-sm text-slate-500">Últimos 6 meses.</p>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Consumo en el tiempo (L/100 km)
        </h2>
        <TrendChart data={trend} />
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Litros por vehículo
        </h2>
        <VehicleLitersChart data={vehicleBars} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">
          Detalle por vehículo
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Vehículo</th>
                <th className="pb-2 text-right">Litros</th>
                <th className="pb-2 text-right">Prom. L/100 km</th>
              </tr>
            </thead>
            <tbody>
              {vehicleBars.map((v) => (
                <tr key={v.name} className="border-t border-slate-100">
                  <td className="py-2">{v.name}</td>
                  <td className="py-2 text-right">{fmtNumber(v.liters)}</td>
                  <td className="py-2 text-right">
                    {v.avgL100 != null ? fmtNumber(v.avgL100, 1) : "—"}
                  </td>
                </tr>
              ))}
              {vehicleBars.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">
                    Sin datos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
