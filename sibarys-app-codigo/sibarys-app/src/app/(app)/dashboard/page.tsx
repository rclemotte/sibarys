import Link from "next/link";
import { esAdminRol, perfilActual, tienePermiso } from "@/lib/permisos";
import { traerKmAlquilados, type KmAlquilado } from "@/lib/kmAlquilados";
import {
  estadoDe,
  ordenarPorUrgencia,
  type FilaConEstado,
  type FilaMantenimiento,
} from "@/lib/mantenimiento";
import { referenciaL100 } from "@/lib/consumo";
import { createClient } from "@/lib/supabase/server";
import type { Consumo } from "@/lib/types";
import {
  fmtNumber,
  fmtMoney,
  fmtDate,
  fmtFechaLarga,
  saludoSegunHora,
  hoyLocal,
  inicioDelDiaLocal,
  inicioDelMesLocal,
} from "@/lib/format";
import { semaforo, sumarDias, type PuntoTiempo } from "@/lib/reportes";
import {
  BarChart3,
  CarFront,
  ClipboardList,
  Fuel,
  Gauge,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Encabezado from "@/components/ui/Encabezado";
import Kpi from "@/components/ui/Kpi";
import AccesoRapido from "@/components/ui/AccesoRapido";
import Aviso from "@/components/ui/Aviso";
import Vacio from "@/components/ui/Vacio";
import Etiqueta from "@/components/ui/Etiqueta";
import { TiempoChart } from "../reportes/Charts";

export const dynamic = "force-dynamic";

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

  // ---- Aviso de mantenimiento (administración) ---------------------------
  const yo = await perfilActual(supabase);
  let mantAviso: FilaConEstado[] = [];
  if (tienePermiso(yo, "puede_editar_vehiculos")) {
    const { data: est, error: errMant } = await supabase
      .from("estado_mantenimiento")
      .select("*")
      .eq("activo", true);
    if (!errMant)
      mantAviso = ordenarPorUrgencia(
        ((est || []) as FilaMantenimiento[])
          .map((f) =>
            estadoDe({
              ...f,
              km_actual: f.km_actual != null ? Number(f.km_actual) : null,
              ultimo_km: f.ultimo_km != null ? Number(f.ultimo_km) : null,
              km_proximo: f.km_proximo != null ? Number(f.km_proximo) : null,
            }),
          )
          .filter((f) => f.estado === "vencido" || f.estado === "proximo"),
      );
  }

  // ---- Límite de km de alquilados (administración) ----------------------
  let kmAviso: KmAlquilado[] = [];
  if (esAdminRol(yo?.rol)) {
    const km = await traerKmAlquilados(supabase);
    kmAviso = (km || [])
      .filter((v) => v.estado === "aviso" || v.estado === "excedido")
      .sort((a, b) => (a.restantes ?? 0) - (b.restantes ?? 0));
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

  // ---- Comparación con los mismos días del mes anterior --------------------
  const hoy = hoyLocal();
  const [yy, mm, dd] = hoy.split("-").map(Number);
  const pm = mm === 1 ? 12 : mm - 1;
  const py = mm === 1 ? yy - 1 : yy;
  const ultimoDiaPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevDesde = inicioDelDiaLocal(`${py}-${pad(pm)}-01`);
  const prevHasta = new Date(
    inicioDelDiaLocal(`${py}-${pad(pm)}-${pad(Math.min(dd, ultimoDiaPrev))}`).getTime() + 86400000,
  );
  const { data: prevRows } = await supabase
    .from("consumo")
    .select("litros, costo_total, distancia_km")
    .gte("registrado_en", prevDesde.toISOString())
    .lt("registrado_en", prevHasta.toISOString());
  const prev = (prevRows || []) as { litros: number; costo_total: number | null; distancia_km: number | null }[];
  const prevLitros = prev.reduce((s, r) => s + Number(r.litros), 0);
  const prevGasto = prev.reduce((s, r) => s + Number(r.costo_total || 0), 0);
  const prevTramo = prev.filter((r) => r.distancia_km != null && Number(r.distancia_km) > 0);
  const prevKm = prevTramo.reduce((s, r) => s + Number(r.distancia_km), 0);
  const prevL100 = prevKm > 0 ? (prevTramo.reduce((s, r) => s + Number(r.litros), 0) / prevKm) * 100 : null;
  const variacion = (actual: number | null, antes: number | null, bueno: "sube" | "baja" | "neutro") =>
    actual != null && antes != null && antes > 0 && prev.length > 0
      ? { pct: ((actual - antes) / antes) * 100, bueno }
      : null;

  // ---- Litros por día del mes (gráfico) -----------------------------------
  const porDia = new Map<string, PuntoTiempo>();
  for (let d = 1; d <= dd; d++) {
    const clave = `${yy}-${pad(mm)}-${pad(d)}`;
    porDia.set(clave, { clave, label: String(d), gasto: 0, litros: 0, cargas: 0 });
  }
  for (const r of cargas) {
    const p = porDia.get(hoyLocal(new Date(r.registrado_en)));
    if (!p) continue;
    p.litros += Number(r.litros) || 0;
    p.gasto += Number(r.costo_total) || 0;
    p.cargas += 1;
  }
  const serieDias = Array.from(porDia.values());

  const esAdmin = esAdminRol(yo?.rol);
  const nombre = ((yo as any)?.nombre_completo || "").trim().split(/\s+/)[0] || "";
  const avisos = alertas.length + mantAviso.length + kmAviso.length;

  return (
    <div className="space-y-5">
      <Encabezado
        titulo={`${saludoSegunHora()}${nombre ? `, ${nombre}` : ""}`}
        subtitulo={`${fmtFechaLarga()} · ${fmtNumber(cargas.length)} ${cargas.length === 1 ? "carga" : "cargas"} este mes`}
        extraAbajo
      />

      <div className="relative z-10 -mt-14 grid grid-cols-2 gap-3 lg:-mt-10 lg:grid-cols-4 lg:gap-4 lg:px-6">
        <Kpi
          etiqueta="Consumo promedio"
          valor={promL100 != null ? fmtNumber(promL100, 1) : "—"}
          unidad="L/100 km"
          punto="bg-brand"
          variacion={variacion(promL100, prevL100, "baja")}
        />
        <Kpi
          etiqueta="Cargas"
          valor={fmtNumber(cargas.length)}
          punto="bg-oro"
          variacion={variacion(cargas.length, prev.length, "neutro")}
        />
        <Kpi
          etiqueta="Litros"
          valor={fmtNumber(litrosMes, 0)}
          unidad="L"
          punto="bg-ok"
          variacion={variacion(litrosMes, prevLitros, "neutro")}
        />
        <Kpi
          etiqueta="Gasto"
          valor={fmtMoney(costoMes).replace("Gs. ", "")}
          unidad="Gs."
          punto="bg-tinta"
          variacion={variacion(costoMes, prevGasto, "neutro")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <AccesoRapido
          href="/cargar"
          destacado
          icono={<Fuel size={24} strokeWidth={2.4} />}
          titulo="Cargar combustible"
          texto="Registrá una carga nueva"
        />
        <AccesoRapido
          href="/historial"
          icono={<ClipboardList size={24} strokeWidth={2.4} />}
          titulo={esAdmin ? "Historial" : "Mi historial"}
          texto="Cargas y consumo"
        />
        <div className="hidden lg:contents">
          <AccesoRapido
            href="/reportes"
            icono={<BarChart3 size={24} strokeWidth={2.4} />}
            titulo="Reportes"
            texto="Gráficos y Excel"
          />
          {esAdmin ? (
            <AccesoRapido
              href="/admin/vehiculos"
              icono={<CarFront size={24} strokeWidth={2.4} />}
              titulo="Vehículos"
              texto="Flota y alquilados"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start [&>*]:min-w-0">
        <div className="space-y-5">
          {avisos > 0 ? (
            <section className="space-y-3">
              <h2 className="px-1 font-display text-lg font-extrabold">Avisos</h2>
              {alertas.length > 0 ? (
                <Aviso
                  tono="error"
                  icono={<TrendingUp size={20} strokeWidth={2.6} className="text-error" />}
                  titulo={`${alertas.length} ${alertas.length === 1 ? "vehículo" : "vehículos"} con consumo alto`}
                  href="/reportes"
                >
                  {alertas
                    .slice(0, 3)
                    .map(
                      (a) =>
                        `${a.vehiculo}: ${fmtNumber(a.l100, 1)} L/100 km (+${fmtNumber((a.l100 / a.referencia - 1) * 100, 0)}%)`,
                    )
                    .join(" · ")}
                </Aviso>
              ) : null}
              {kmAviso.length > 0 ? (
                <Aviso
                  tono="error"
                  icono={<Gauge size={20} strokeWidth={2.6} className="text-error" />}
                  titulo={`${kmAviso.length} ${kmAviso.length === 1 ? "alquilado" : "alquilados"} cerca del límite de km`}
                  href="/reportes/km-alquilados"
                >
                  {kmAviso
                    .slice(0, 3)
                    .map((v) =>
                      v.estado === "excedido"
                        ? `${v.nombre}: se pasó ${fmtNumber(-(v.restantes ?? 0))} km`
                        : `${v.nombre}: faltan ${fmtNumber(v.restantes ?? 0)} km`,
                    )
                    .join(" · ")}
                </Aviso>
              ) : null}
              {mantAviso.length > 0 ? (
                <Aviso
                  tono={mantAviso.some((f) => f.estado === "vencido") ? "error" : "alerta"}
                  icono={
                    <Wrench
                      size={20}
                      strokeWidth={2.6}
                      className={mantAviso.some((f) => f.estado === "vencido") ? "text-error" : "text-alerta"}
                    />
                  }
                  titulo={
                    mantAviso.length === 1
                      ? "1 mantenimiento próximo o vencido"
                      : `${mantAviso.length} mantenimientos próximos o vencidos`
                  }
                  href="/admin/mantenimiento"
                >
                  {mantAviso
                    .slice(0, 3)
                    .map((f) =>
                      f.faltan != null && f.faltan <= 0
                        ? `${f.nombre}: vencido`
                        : `${f.nombre}: faltan ${fmtNumber(f.faltan ?? 0)} km`,
                    )
                    .join(" · ")}
                </Aviso>
              ) : null}
            </section>
          ) : null}

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Litros por día</h2>
              <span className="subtitulo">Este mes</span>
            </div>
            <TiempoChart data={serieDias} metrica="litros" />
          </section>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-extrabold">Últimas cargas</h2>
            <Link href="/historial" className="btn-chico text-brand hover:bg-brand-suave">
              Ver todo
            </Link>
          </div>
          {recientes.length === 0 ? (
            <Vacio
              icono={<Fuel size={26} strokeWidth={2.4} />}
              titulo="Todavía no hay cargas este mes"
              texto="Cuando registres una carga, aparece acá."
              accion={
                <Link href="/cargar" className="btn-primary">
                  Cargar combustible
                </Link>
              }
            />
          ) : (
            <ul className="card divide-y divide-linea p-0">
              {recientes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-suave text-brand">
                    <Fuel size={20} strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{r.vehiculo_nombre}</p>
                    <p className="truncate text-xs font-semibold text-suave">
                      {fmtDate(r.registrado_en)} · {fmtNumber(r.odometro_km)} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-extrabold leading-tight">
                      {fmtNumber(Number(r.litros), 2)} L
                    </p>
                    {r.litros_por_100km != null ? (
                      <span className="text-xs font-bold text-suave">{fmtNumber(r.litros_por_100km, 1)} L/100</span>
                    ) : (
                      <Etiqueta tono="neutro">1ª carga</Etiqueta>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
