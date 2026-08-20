import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import { fmtNumber, fmtMoney, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data: rows } = await supabase
    .from("consumo")
    .select("*")
    .gte("registrado_en", inicioMes.toISOString())
    .order("registrado_en", { ascending: false });

  const cargas = (rows || []) as Consumo[];

  // ---- Alerta de consumo alto de HOY (chofer) ------------------------------
  // Referencia por vehículo: consumo_promedio_asignado (tipeado); si no está,
  // cae al promedio histórico real del vehículo. Se avisa si el rendimiento de
  // una carga de hoy es 15% peor (menos km/l) que esa referencia.
  const UMBRAL_PEOR = 0.15;

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const cargasHoy = cargas.filter(
    (r) =>
      r.km_por_litro != null &&
      new Date(r.registrado_en).getTime() >= inicioHoy.getTime()
  );

  const alertas: {
    vehiculo: string;
    kmL: number;
    referencia: number;
  }[] = [];

  if (cargasHoy.length > 0) {
    const vehIds = Array.from(new Set(cargasHoy.map((r) => r.vehiculo_id)));

    const { data: vehData } = await supabase
      .from("vehiculos")
      .select("id, consumo_promedio_asignado")
      .in("id", vehIds);
    const asignadoPorVeh = new Map<string, number | null>();
    (vehData || []).forEach((v: any) =>
      asignadoPorVeh.set(
        v.id,
        v.consumo_promedio_asignado != null
          ? Number(v.consumo_promedio_asignado)
          : null
      )
    );

    // Promedio histórico (respaldo) por vehículo
    const { data: histData } = await supabase
      .from("consumo")
      .select("vehiculo_id, km_por_litro")
      .in("vehiculo_id", vehIds)
      .not("km_por_litro", "is", null);
    const acum = new Map<string, { suma: number; n: number }>();
    (histData || []).forEach((r: any) => {
      const a = acum.get(r.vehiculo_id) || { suma: 0, n: 0 };
      a.suma += Number(r.km_por_litro);
      a.n += 1;
      acum.set(r.vehiculo_id, a);
    });

    const yaAlertado = new Set<string>();
    for (const r of cargasHoy) {
      if (yaAlertado.has(r.vehiculo_id)) continue;
      const asignado = asignadoPorVeh.get(r.vehiculo_id);
      const hist = acum.get(r.vehiculo_id);
      const referencia =
        asignado != null && asignado > 0
          ? asignado
          : hist && hist.n > 0
          ? hist.suma / hist.n
          : null;
      if (referencia == null || referencia <= 0) continue;
      if (Number(r.km_por_litro) < referencia * (1 - UMBRAL_PEOR)) {
        alertas.push({
          vehiculo: r.vehiculo_nombre,
          kmL: Number(r.km_por_litro),
          referencia,
        });
        yaAlertado.add(r.vehiculo_id);
      }
    }
  }

  const litrosMes = cargas.reduce((s, r) => s + Number(r.litros), 0);
  const costoMes = cargas.reduce((s, r) => s + Number(r.costo_total || 0), 0);
  const conKmL = cargas.filter((r) => r.km_por_litro != null);
  const promKmL =
    conKmL.length > 0
      ? conKmL.reduce((s, r) => s + Number(r.km_por_litro), 0) / conKmL.length
      : null;

  const recientes = cargas.slice(0, 5);

  return (
    <div className="space-y-4">
      {alertas.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-lg" aria-hidden="true">
              ⚠️
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800">
                Consumo alto hoy
              </p>
              {alertas.map((a, i) => (
                <p key={i} className="text-xs text-amber-700">
                  {a.vehiculo}: {fmtNumber(a.kmL, 1)} km/l (referencia{" "}
                  {fmtNumber(a.referencia, 1)} km/l). Revisá la carga.
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-xl font-bold">Resumen del mes</h1>
        <p className="text-sm text-slate-500">
          {inicioMes.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi
          label="Consumo prom."
          value={promKmL != null ? `${fmtNumber(promKmL, 1)} km/l` : "—"}
          hint="Promedio de cargas"
        />
        <Kpi label="Cargas" value={fmtNumber(cargas.length)} hint="En el mes" />
        <Kpi
          label="Litros"
          value={`${fmtNumber(litrosMes, 0)} L`}
          hint="Total del mes"
        />
        <Kpi label="Gasto" value={fmtMoney(costoMes)} hint="Total del mes" />
      </div>

      <Link href="/cargar" className="btn-primary w-full">
        ⛽ Registrar nueva carga
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">
            Últimas cargas
          </h2>
          <Link href="/historial" className="text-sm text-brand">
            Ver todo
          </Link>
        </div>

        {recientes.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            Todavía no hay cargas este mes.
          </div>
        ) : (
          <ul className="space-y-2">
            {recientes.map((r) => (
              <li key={r.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.vehiculo_nombre}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(r.registrado_en)} · {fmtNumber(r.odometro_km)} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmtNumber(r.litros, 1)} L</p>
                  <p className="text-xs text-slate-400">
                    {r.km_por_litro != null
                      ? `${fmtNumber(r.km_por_litro, 1)} km/l`
                      : "1ª carga"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
