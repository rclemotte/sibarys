import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import { fmtNumber } from "@/lib/format";
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

  // Tendencia de consumo (km/l) en el tiempo
  const trend = cargas
    .filter((r) => r.km_por_litro != null)
    .map((r) => ({
      label: new Date(r.registrado_en).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      }),
      kmPerLiter: Number(r.km_por_litro),
    }));

  // Agregado por vehículo
  const porVehiculo = new Map<
    string,
    { name: string; liters: number; kmlSum: number; kmlCount: number }
  >();
  for (const r of cargas) {
    const key = r.vehiculo_id;
    const cur =
      porVehiculo.get(key) || {
        name: r.vehiculo_nombre,
        liters: 0,
        kmlSum: 0,
        kmlCount: 0,
      };
    cur.liters += Number(r.litros);
    if (r.km_por_litro != null) {
      cur.kmlSum += Number(r.km_por_litro);
      cur.kmlCount += 1;
    }
    porVehiculo.set(key, cur);
  }

  const vehicleBars = Array.from(porVehiculo.values())
    .map((v) => ({
      name: v.name,
      liters: Math.round(v.liters),
      avgKmL: v.kmlCount > 0 ? v.kmlSum / v.kmlCount : null,
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
          Consumo en el tiempo (km/l)
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
                <th className="pb-2 text-right">Prom. km/l</th>
              </tr>
            </thead>
            <tbody>
              {vehicleBars.map((v) => (
                <tr key={v.name} className="border-t border-slate-100">
                  <td className="py-2">{v.name}</td>
                  <td className="py-2 text-right">{fmtNumber(v.liters)}</td>
                  <td className="py-2 text-right">
                    {v.avgKmL != null ? fmtNumber(v.avgKmL, 1) : "—"}
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
