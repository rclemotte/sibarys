import { fmtDateTime, fmtMoney, fmtNumber } from "@/lib/format";
import type { FilaExport } from "@/lib/exportCargas";
import { totalesExport } from "@/lib/exportCargas";
import BotonImprimir from "./BotonImprimir";

/** Hoja del reporte de cargas (la arma la página /imprimir/cargas). */
export default function ReporteCargas({
  filas,
  filtros,
  t,
  generado,
}: {
  filas: FilaExport[];
  filtros: string[][];
  t: ReturnType<typeof totalesExport>;
  generado: string;
}) {
  return (
    <main className="mx-auto max-w-[1100px] bg-white p-6 text-slate-800 print:max-w-none print:p-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; } @media print { html, body { background: white !important; } }`}</style>
      <BotonImprimir />

      <header className="flex items-end justify-between border-b-2 border-slate-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Sibarys · Control de combustible
          </p>
          <h1 className="text-2xl font-bold">Reporte de cargas</h1>
        </div>
        <p className="text-xs text-slate-500">
          Generado el {fmtDateTime(generado)}
        </p>
      </header>

      <section className="mt-3 grid grid-cols-4 gap-3 text-xs">
        {filtros.map(([k, v]) => (
          <div key={k}>
            <p className="text-slate-500">{k}</p>
            <p className="font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-3 grid grid-cols-5 gap-2">
        {[
          ["Cargas", fmtNumber(t.cargas)],
          ["Litros", fmtNumber(t.litros, 1)],
          ["Total en Guaraníes", fmtMoney(t.gasto)],
          ["Km recorridos", fmtNumber(t.km)],
          ["Consumo promedio", t.l100 != null ? `${fmtNumber(t.l100, 1)} L/100 km` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-[11px] text-slate-500">{k}</p>
            <p className="text-base font-bold">{v}</p>
          </div>
        ))}
      </section>

      {filas.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No hay cargas para esos filtros.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-800 text-left text-white">
              {[
                "Fecha",
                "Vehículo",
                "Chofer",
                "Combustible",
                "Odómetro",
                "Recorrido",
                "Litros",
                "Precio/L",
                "Total ₲",
                "L/100 km",
                "Estación",
                "Emblema",
              ].map((h) => (
                <th key={h} className="px-1.5 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((r, i) => (
              <tr
                key={r.id}
                className={`break-inside-avoid ${i % 2 ? "bg-slate-50" : ""}`}
              >
                <td className="whitespace-nowrap px-1.5 py-1">{fmtDateTime(r.registrado_en)}</td>
                <td className="px-1.5 py-1">
                  {r.vehiculo_nombre}
                  <span className="text-slate-400"> {r.patente}</span>
                </td>
                <td className="px-1.5 py-1">{r.chofer_nombre ?? ""}</td>
                <td className="px-1.5 py-1">{r.combustible_nombre ?? ""}</td>
                <td className="px-1.5 py-1 text-right tabular-nums">{fmtNumber(r.odometro_km)}</td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  {r.distancia_km != null ? fmtNumber(r.distancia_km) : "—"}
                </td>
                <td className="px-1.5 py-1 text-right tabular-nums">{fmtNumber(r.litros, 2)}</td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  {r.precio_litro != null ? fmtNumber(r.precio_litro) : ""}
                </td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  {r.costo_total != null ? fmtNumber(r.costo_total) : ""}
                </td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  {r.litros_por_100km != null ? fmtNumber(r.litros_por_100km, 1) : "—"}
                </td>
                <td className="px-1.5 py-1">{r.estacion ?? ""}</td>
                <td className="px-1.5 py-1">{r.emblema ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
