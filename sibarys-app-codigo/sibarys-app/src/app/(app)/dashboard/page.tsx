import Link from "next/link";
import { referenciaL100 } from "@/lib/consumo";
import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import {
  fmtNumber,
  fmtMoney,
  fmtDate,
  hoyLocal,
  inicioDelDiaLocal,
  inicioDelMesLocal,
} from "@/lib/format";
import { semaforo, sumarDias } from "@/lib/reportes";

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

  // Inicio del mes y del día en hora de Paraguay (el servidor está en UTC)
  const inicioMes = inicioDelMesLocal();

  const { data: rows } = await supabase
    .from("consumo")
    .select("*")
    .gte("registrado_en", inicioMes.toISOString())
    .order("registrado_en", { ascending: false });

  const cargas = (rows || []) as Consumo[];

  // ---- Alerta de consumo alto (mismo criterio que Reportes) -------------
  // Por vehículo, con las cargas de los últimos 30 días: litros ÷ km de todos
  // sus tramos. Solo se avisa cuando el vehículo ya cargó al menos 2 tanques
  // en ese lapso (dato confiable) y su consumo supera en más de 25% su
  // referencia. Cargas sueltas no disparan alertas.
  const desde30 = inicioDelDiaLocal(sumarDias(hoyLocal(), -29)).toISOString();
  const columnas = "vehiculo_id, vehiculo_nombre, litros, distancia_km";
  let tramos: any[] = [];
  const viaFuncion = await supabase
    .rpc("reporte_consumo", { p_desde: desde30 })
    .select(columnas);
  if (!viaFuncion.error) {
    tramos = (viaFuncion.data as any[]) || [];
  } else {
    const { data } = await supabase
      .from("consumo")
      .select(columnas)
      .gte("registrado_en", desde30);
    tramos = data || [];
  }

  const porVeh = new Map<
    string,
    { nombre: string; litros: number; km: number }
  >();
  for (const r of tramos) {
    const km = Number(r.distancia_km);
    if (!(km > 0)) continue;
    const a = porVeh.get(r.vehiculo_id) || {
      nombre: r.vehiculo_nombre,
      litros: 0,
      km: 0,
    };
    a.litros += Number(r.litros) || 0;
    a.km += km;
    porVeh.set(r.vehiculo_id, a);
  }

  const alertas: {
    vehiculo: string;
    l100: number;
    referencia: number;
    km: number;
  }[] = [];
  if (porVeh.size > 0) {
    const { data: vehData } = await supabase
      .from("vehiculos")
      .select("*")
      .in("id", Array.from(porVeh.keys()));
    for (const v of (vehData || []) as any[]) {
      const a = porVeh.get(v.id)!;
      const ref = referenciaL100(v);
      const l100 = (a.litros / a.km) * 100;
      const tanque =
        v.capacidad_tanque_litros != null
          ? Number(v.capacidad_tanque_litros)
          : null;
      if (semaforo(l100, ref, a.litros, tanque) === "alto" && ref != null)
        alertas.push({
          vehiculo: v.nombre ?? a.nombre,
          l100,
          referencia: ref,
          km: a.km,
        });
    }
    alertas.sort((x, y) => y.l100 / y.referencia - x.l100 / x.referencia);
  }

  const litrosMes = cargas.reduce((s, r) => s + Number(r.litros), 0);
  const costoMes = cargas.reduce((s, r) => s + Number(r.costo_total || 0), 0);
  // Consumo del mes: litros de los tramos ÷ km recorridos (igual que Reportes)
  const conTramo = cargas.filter(
    (r) => r.distancia_km != null && Number(r.distancia_km) > 0,
  );
  const kmMes = conTramo.reduce((s, r) => s + Number(r.distancia_km), 0);
  const promL100 =
    kmMes > 0
      ? (conTramo.reduce((s, r) => s + Number(r.litros), 0) / kmMes) * 100
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
                Consumo alto en los últimos 30 días
              </p>
              {alertas.map((a, i) => (
                <p key={i} className="text-xs text-amber-700">
                  <span className="font-semibold">{a.vehiculo}</span>:{" "}
                  {fmtNumber(a.l100, 1)} L/100 km, referencia{" "}
                  {fmtNumber(a.referencia, 1)} (+
                  {fmtNumber((a.l100 / a.referencia - 1) * 100, 0)}%) en{" "}
                  {fmtNumber(a.km, 0)} km.
                </p>
              ))}
              <Link
                href="/reportes"
                className="inline-block pt-1 text-xs font-semibold text-amber-800 underline"
              >
                Ver detalle en Reportes
              </Link>
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
          value={promL100 != null ? `${fmtNumber(promL100, 1)} L/100 km` : "—"}
          hint="Litros ÷ km del mes"
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
                    {r.litros_por_100km != null
                      ? `${fmtNumber(r.litros_por_100km, 1)} L/100 km`
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
