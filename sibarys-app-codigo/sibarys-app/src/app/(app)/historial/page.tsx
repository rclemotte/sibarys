import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import { fmtNumber, fmtMoney, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("consumo")
    .select("*")
    .order("registrado_en", { ascending: false })
    .limit(100);

  const cargas = (data || []) as Consumo[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Historial</h1>
        <p className="text-sm text-slate-500">Últimas 100 cargas.</p>
      </div>

      {cargas.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No hay cargas registradas.
        </div>
      ) : (
        <ul className="space-y-2">
          {cargas.map((r) => {
            const anomalia =
              r.km_por_litro != null &&
              (r.km_por_litro < 2 || r.km_por_litro > 30);
            return (
              <li key={r.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {r.vehiculo_nombre}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        {r.patente}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmtDateTime(r.registrado_en)}
                      {r.combustible_nombre ? ` · ${r.combustible_nombre}` : ""}
                    </p>
                    {r.chofer_nombre ? (
                      <p className="text-xs text-slate-400">
                        Chofer: {r.chofer_nombre}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmtNumber(r.litros, 1)} L</p>
                    {r.costo_total != null ? (
                      <p className="text-xs text-slate-400">
                        {fmtMoney(r.costo_total)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center text-xs">
                  <div>
                    <p className="text-slate-400">Odómetro</p>
                    <p className="font-medium">{fmtNumber(r.odometro_km)} km</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Recorrido</p>
                    <p className="font-medium">
                      {r.distancia_km != null
                        ? `${fmtNumber(r.distancia_km)} km`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Consumo</p>
                    <p
                      className={`font-medium ${
                        anomalia ? "text-amber-600" : ""
                      }`}
                    >
                      {r.km_por_litro != null
                        ? `${fmtNumber(r.km_por_litro, 1)} km/l`
                        : "1ª carga"}
                      {anomalia ? " ⚠️" : ""}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
