"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fmtNumber, fmtMoney } from "@/lib/format";
import {
  FILTROS_VACIOS,
  PERIODOS,
  agrupacionSugerida,
  aplicarFiltros,
  agruparPor,
  diasEntre,
  ordenar,
  rankingVehiculos,
  serieTiempo,
  sumarDias,
  totales,
  variacion,
  type Agrupacion,
  type FilaRanking,
  type FilaReporte,
  type Filtros,
  type Orden,
  type Semaforo,
} from "@/lib/reportes";
import { TiempoChart } from "./Charts";

// ------------------------------------------------------------ helpers de UI

const fmtL100 = (n: number | null | undefined) =>
  n == null ? "—" : `${fmtNumber(n, 1)} L/100 km`;
const fmtCostoKm = (n: number | null | undefined) =>
  n == null ? "—" : `${fmtMoney(n)}/km`;

const opciones = (filas: FilaReporte[], clave: (r: FilaReporte) => string) =>
  Array.from(new Set(filas.map(clave))).sort((a, b) => a.localeCompare(b));

function Delta({
  v,
  invertir = false,
}: {
  v: number | null;
  invertir?: boolean;
}) {
  if (v == null || !isFinite(v)) return null;
  const sube = v > 0;
  // Para gasto/litros, subir es "peor" (ámbar); bajar, "mejor" (verde)
  const malo = invertir ? !sube : sube;
  const color =
    Math.abs(v) < 0.5
      ? "text-slate-400"
      : malo
        ? "text-amber-700"
        : "text-emerald-700";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {sube ? "▲" : "▼"} {fmtNumber(Math.abs(v), 0)}% vs periodo anterior
    </span>
  );
}

function Kpi({
  label,
  valor,
  extra,
}: {
  label: string;
  valor: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold leading-tight text-slate-900">
        {valor}
      </p>
      <div className="mt-0.5 min-h-[1rem]">{extra}</div>
    </div>
  );
}

const SEMAFORO: Record<
  Semaforo,
  { label: string; icono: string; clase: string }
> = {
  ok: { label: "Normal", icono: "✓", clase: "bg-emerald-50 text-emerald-800" },
  atencion: {
    label: "Atención",
    icono: "!",
    clase: "bg-amber-50 text-amber-800",
  },
  alto: { label: "Alto", icono: "▲", clase: "bg-red-50 text-red-800" },
  sin_datos: {
    label: "Pocos datos",
    icono: "…",
    clase: "bg-slate-100 text-slate-500",
  },
};

function PillSemaforo({ s }: { s: Semaforo }) {
  const x = SEMAFORO[s];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.clase}`}
    >
      <span aria-hidden="true">{x.icono}</span>
      {x.label}
    </span>
  );
}

// ------------------------------------------------------------ rankings

type Vista =
  | "vehiculos"
  | "choferes"
  | "estaciones"
  | "combustibles"
  | "propiedad"
  | "modelos";

const VISTAS: { clave: Vista; label: string }[] = [
  { clave: "vehiculos", label: "Vehículos" },
  { clave: "choferes", label: "Choferes" },
  { clave: "estaciones", label: "Estaciones" },
  { clave: "combustibles", label: "Combustibles" },
  { clave: "modelos", label: "Modelos" },
  { clave: "propiedad", label: "Propios / alquilados" },
];

const ORDENES: { clave: Orden; label: string }[] = [
  { clave: "gasto", label: "Gasto" },
  { clave: "litros", label: "Litros" },
  { clave: "cargas", label: "Cargas" },
  { clave: "km", label: "Km recorridos" },
  { clave: "costoKm", label: "Costo por km" },
  { clave: "l100", label: "Consumo" },
];

function valorPrincipal(f: FilaRanking, orden: Orden): string {
  switch (orden) {
    case "gasto":
      return fmtMoney(f.gasto);
    case "litros":
      return `${fmtNumber(f.litros, 0)} L`;
    case "cargas":
      return `${f.cargas} carga${f.cargas === 1 ? "" : "s"}`;
    case "km":
      return `${fmtNumber(f.km, 0)} km`;
    case "costoKm":
      return fmtCostoKm(f.costoKm);
    case "l100":
      return fmtL100(f.l100);
  }
}

function construirRanking(vista: Vista, filas: FilaReporte[]): FilaRanking[] {
  switch (vista) {
    case "vehiculos":
      return rankingVehiculos(filas);
    case "choferes":
      return agruparPor(
        filas,
        (r) => r.chofer_id,
        (r) => r.chofer,
      );
    case "estaciones":
      return agruparPor(
        filas,
        (r) => r.estacion,
        (r) => r.estacion,
        (r) => r.emblema,
      );
    case "combustibles":
      return agruparPor(
        filas,
        (r) => r.combustible,
        (r) => r.combustible,
      );
    case "modelos":
      return agruparPor(
        filas,
        (r) => r.modelo,
        (r) => r.modelo,
      );
    case "propiedad":
      return agruparPor(
        filas,
        (r) => (r.alquilado ? `A:${r.empresa ?? ""}` : "P"),
        (r) =>
          r.alquilado
            ? `Alquilados${r.empresa ? ` · ${r.empresa}` : ""}`
            : "Propios",
      );
  }
}

// ------------------------------------------------------------ panel

export default function ReportesPanel({
  filas,
  hoy,
  esAdmin = true,
}: {
  filas: FilaReporte[];
  hoy: string;
  esAdmin?: boolean;
}) {
  // El chofer ve solo sus cargas: no tiene sentido filtrar ni rankear choferes
  const vistas = esAdmin
    ? VISTAS
    : VISTAS.filter((v) => v.clave !== "choferes");
  const inicial = PERIODOS.find((p) => p.clave === "mes")!.rango();
  const [periodo, setPeriodo] = useState("mes");
  const [f, setF] = useState<Filtros>({ ...FILTROS_VACIOS, ...inicial });
  const [verFiltros, setVerFiltros] = useState(false);
  const [metrica, setMetrica] = useState<"gasto" | "litros">("gasto");
  const [agrupacion, setAgrupacion] = useState<Agrupacion | "auto">("auto");
  const [vista, setVista] = useState<Vista>("vehiculos");
  const [orden, setOrden] = useState<Orden>("gasto");
  const [verTodos, setVerTodos] = useState(false);

  const set = (k: keyof Filtros, v: string) => setF((x) => ({ ...x, [k]: v }));

  // Opciones de los filtros (de todas las cargas, para que no "desaparezcan")
  const ops = useMemo(
    () => ({
      vehiculos: Array.from(
        new Map(
          filas.map((r) => [r.vehiculo_id, `${r.vehiculo} — ${r.patente}`]),
        ).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1], "es", { numeric: true })),
      choferes: Array.from(
        new Map(filas.map((r) => [r.chofer_id, r.chofer])).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
      modelos: opciones(filas, (r) => r.modelo),
      combustibles: opciones(filas, (r) => r.combustible),
      emblemas: opciones(filas, (r) => r.emblema),
      estaciones: opciones(
        f.emblema ? filas.filter((r) => r.emblema === f.emblema) : filas,
        (r) => r.estacion,
      ),
    }),
    [filas, f.emblema],
  );

  const activos = (
    Object.keys(FILTROS_VACIOS) as (keyof typeof FILTROS_VACIOS)[]
  ).filter((k) => f[k]).length;

  const sel = useMemo(() => aplicarFiltros(filas, f), [filas, f]);
  const t = useMemo(() => totales(sel), [sel]);

  // Mismo largo de periodo, inmediatamente antes, con los mismos filtros
  const anterior = useMemo(() => {
    const dias = diasEntre(f.desde, f.hasta);
    const hasta = sumarDias(f.desde, -1);
    const desde = sumarDias(hasta, -(dias - 1));
    return totales(aplicarFiltros(filas, { ...f, desde, hasta }));
  }, [filas, f]);

  const ag =
    agrupacion === "auto" ? agrupacionSugerida(f.desde, f.hasta) : agrupacion;
  const serie = useMemo(
    () => serieTiempo(sel, f.desde, f.hasta, ag),
    [sel, f.desde, f.hasta, ag],
  );

  const ranking = useMemo(
    () => ordenar(construirRanking(vista, sel), orden),
    [vista, sel, orden],
  );
  const visibles = verTodos ? ranking : ranking.slice(0, 10);

  function elegirPeriodo(clave: string) {
    setPeriodo(clave);
    const p = PERIODOS.find((x) => x.clave === clave);
    if (p) setF((x) => ({ ...x, ...p.rango() }));
  }

  function exportar() {
    const wb = XLSX.utils.book_new();
    const filtrosTxt = [
      `Periodo: ${f.desde} a ${f.hasta}`,
      f.vehiculo &&
        `Vehículo: ${ops.vehiculos.find((v) => v[0] === f.vehiculo)?.[1]}`,
      f.modelo && `Modelo: ${f.modelo}`,
      f.chofer && `Chofer: ${ops.choferes.find((c) => c[0] === f.chofer)?.[1]}`,
      f.combustible && `Combustible: ${f.combustible}`,
      f.emblema && `Emblema: ${f.emblema}`,
      f.estacion && `Estación: ${f.estacion}`,
      f.propiedad && `Propiedad: ${f.propiedad}`,
    ].filter(Boolean);
    const resumen = [
      ...filtrosTxt.map((x) => ({ Dato: "Filtro", Valor: x as string })),
      { Dato: "Gasto", Valor: Math.round(t.gasto) },
      { Dato: "Litros", Valor: Math.round(t.litros * 100) / 100 },
      { Dato: "Cargas", Valor: t.cargas },
      { Dato: "Vehículos", Valor: t.vehiculos },
      { Dato: "Km recorridos", Valor: Math.round(t.km) },
      {
        Dato: "Costo por km",
        Valor: t.costoKm != null ? Math.round(t.costoKm) : "",
      },
      {
        Dato: "Consumo (L/100 km)",
        Valor: t.l100 != null ? Math.round(t.l100 * 10) / 10 : "",
      },
    ];
    const hoja = (nombre: string, datos: object[]) =>
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(datos.length ? datos : [{ "": "Sin datos" }]),
        nombre,
      );
    const rk = (v: Vista, titulo: string) =>
      ordenar(construirRanking(v, sel), "gasto").map((x) => ({
        [titulo]: x.nombre,
        ...(x.detalle ? { Detalle: x.detalle } : {}),
        Cargas: x.cargas,
        Litros: Math.round(x.litros * 100) / 100,
        Gasto: Math.round(x.gasto),
        "Km recorridos": Math.round(x.km),
        "Costo por km": x.costoKm != null ? Math.round(x.costoKm) : "",
        "Consumo (L/100 km)":
          x.l100 != null ? Math.round(x.l100 * 10) / 10 : "",
        ...(v === "vehiculos"
          ? {
              "Referencia (L/100 km)": x.ref_l100 ?? "",
              Estado: x.semaforo ? SEMAFORO[x.semaforo].label : "",
            }
          : {}),
      }));
    hoja("Resumen", resumen);
    hoja("Vehiculos", rk("vehiculos", "Vehículo"));
    hoja("Choferes", rk("choferes", "Chofer"));
    hoja("Estaciones", rk("estaciones", "Estación"));
    hoja("Combustibles", rk("combustibles", "Combustible"));
    hoja("Modelos", rk("modelos", "Modelo"));
    hoja(
      "Cargas",
      sel.map((r) => ({
        Fecha: r.fecha,
        Vehículo: r.vehiculo,
        Patente: r.patente,
        Modelo: r.modelo,
        Chofer: r.chofer,
        Combustible: r.combustible,
        Estación: r.estacion,
        Emblema: r.emblema,
        Km: r.km,
        "Recorrido (km)": r.recorrido ?? "",
        Litros: r.litros,
        Gasto: r.gasto,
        "Tanque lleno": r.tanque_lleno ? "Sí" : "No",
        Alquilado: r.alquilado ? (r.empresa ?? "Sí") : "No",
      })),
    );
    XLSX.writeFile(wb, `sibarys-reporte-${f.desde}-a-${f.hasta}.xlsx`);
  }

  const selectCls = "field py-2 text-sm";

  return (
    <div className="space-y-4 lg:relative lg:left-1/2 lg:w-[min(72rem,calc(100vw-3rem))] lg:-translate-x-1/2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            {esAdmin ? "Reportes" : "Mis cargas"}
          </h1>
          <p className="text-sm text-slate-500">
            {f.desde.split("-").reverse().join("/")} al{" "}
            {f.hasta.split("-").reverse().join("/")}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm"
          onClick={exportar}
        >
          ⬇ Excel
        </button>
      </div>

      {/* Periodo */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          ...PERIODOS.map((p) => ({ clave: p.clave, label: p.label })),
          { clave: "custom", label: "Elegir fechas" },
        ].map((p) => (
          <button
            key={p.clave}
            type="button"
            onClick={() =>
              p.clave === "custom"
                ? setPeriodo("custom")
                : elegirPeriodo(p.clave)
            }
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              periodo === p.clave
                ? "bg-brand text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className={selectCls}
              value={f.desde}
              max={f.hasta}
              onChange={(e) => e.target.value && set("desde", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className={selectCls}
              value={f.hasta}
              min={f.desde}
              max={hoy}
              onChange={(e) => e.target.value && set("hasta", e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {/* Filtros */}
      <div className="card space-y-3 py-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
          onClick={() => setVerFiltros((v) => !v)}
          aria-expanded={verFiltros}
        >
          <span>
            Filtros{" "}
            {activos > 0 ? (
              <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
                {activos}
              </span>
            ) : (
              <span className="font-normal text-slate-400">
                (todos los datos)
              </span>
            )}
          </span>
          <span className="text-slate-400">{verFiltros ? "▲" : "▼"}</span>
        </button>

        {verFiltros ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Vehículo</label>
              <select
                className={selectCls}
                value={f.vehiculo}
                onChange={(e) => set("vehiculo", e.target.value)}
              >
                <option value="">Todos</option>
                {ops.vehiculos.map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Modelo</label>
              <select
                className={selectCls}
                value={f.modelo}
                onChange={(e) => set("modelo", e.target.value)}
              >
                <option value="">Todos</option>
                {ops.modelos.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {esAdmin ? (
              <div>
                <label className="label">Chofer</label>
                <select
                  className={selectCls}
                  value={f.chofer}
                  onChange={(e) => set("chofer", e.target.value)}
                >
                  <option value="">Todos</option>
                  {ops.choferes.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="label">Combustible</label>
              <select
                className={selectCls}
                value={f.combustible}
                onChange={(e) => set("combustible", e.target.value)}
              >
                <option value="">Todos</option>
                {ops.combustibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Emblema</label>
              <select
                className={selectCls}
                value={f.emblema}
                onChange={(e) =>
                  setF((x) => ({ ...x, emblema: e.target.value, estacion: "" }))
                }
              >
                <option value="">Todos</option>
                {ops.emblemas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estación</label>
              <select
                className={selectCls}
                value={f.estacion}
                onChange={(e) => set("estacion", e.target.value)}
              >
                <option value="">Todas</option>
                {ops.estaciones.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="label">Propiedad</label>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {[
                  { v: "", l: "Todos" },
                  { v: "propios", l: "Propios" },
                  { v: "alquilados", l: "Alquilados" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set("propiedad", o.v)}
                    className={`rounded-lg py-1.5 text-sm font-medium ${
                      f.propiedad === o.v
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {activos > 0 ? (
              <button
                type="button"
                className="btn-ghost py-2 text-sm sm:col-span-2 lg:col-span-1 lg:self-end"
                onClick={() => setF((x) => ({ ...x, ...FILTROS_VACIOS }))}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi
          label="Gasto"
          valor={fmtMoney(t.gasto)}
          extra={<Delta v={variacion(t.gasto, anterior.gasto)} />}
        />
        <Kpi
          label="Litros"
          valor={`${fmtNumber(t.litros, 0)} L`}
          extra={<Delta v={variacion(t.litros, anterior.litros)} />}
        />
        <Kpi
          label="Cargas"
          valor={fmtNumber(t.cargas)}
          extra={
            <span className="text-xs text-slate-400">
              {t.vehiculos} vehículo(s)
            </span>
          }
        />
        <Kpi
          label="Km recorridos"
          valor={`${fmtNumber(t.km, 0)} km`}
          extra={<Delta v={variacion(t.km, anterior.km)} invertir />}
        />
        <Kpi
          label="Costo por km"
          valor={fmtCostoKm(t.costoKm)}
          extra={
            t.costoKm != null && anterior.costoKm != null ? (
              <Delta v={variacion(t.costoKm, anterior.costoKm)} />
            ) : null
          }
        />
        <Kpi
          label="Consumo prom."
          valor={fmtL100(t.l100)}
          extra={
            t.l100 != null && anterior.l100 != null ? (
              <Delta v={variacion(t.l100, anterior.l100)} />
            ) : null
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Evolución */}
        <div className="card lg:sticky lg:top-20">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-600">
              {metrica === "gasto" ? "Gasto" : "Litros"} por{" "}
              {ag === "dia" ? "día" : ag}
            </h2>
            <div className="flex gap-1">
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                value={metrica}
                onChange={(e) =>
                  setMetrica(e.target.value as "gasto" | "litros")
                }
                aria-label="Métrica"
              >
                <option value="gasto">Gasto</option>
                <option value="litros">Litros</option>
              </select>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                value={agrupacion}
                onChange={(e) =>
                  setAgrupacion(e.target.value as Agrupacion | "auto")
                }
                aria-label="Agrupar por"
              >
                <option value="auto">Automático</option>
                <option value="dia">Por día</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mes</option>
              </select>
            </div>
          </div>
          <TiempoChart data={serie} metrica={metrica} />
        </div>

        {/* Rankings */}
        <div className="card space-y-3">
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {vistas.map((v) => (
              <button
                key={v.clave}
                type="button"
                onClick={() => {
                  setVista(v.clave);
                  setVerTodos(false);
                }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  vista === v.clave
                    ? "bg-slate-900 text-white"
                    : "text-slate-500"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              {ranking.length}{" "}
              {ranking.length === 1 ? "resultado" : "resultados"}
            </p>
            <label className="flex items-center gap-1 text-xs text-slate-500">
              Ordenar por
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
              >
                {ORDENES.map((o) => (
                  <option key={o.clave} value={o.clave}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ranking.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Sin cargas en este periodo.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibles.map((x, i) => {
                const max = ranking[0][orden] ?? 0;
                const val = x[orden] ?? 0;
                const ancho = max
                  ? Math.max(2, ((val as number) / (max as number)) * 100)
                  : 0;
                return (
                  <li key={x.clave} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          <span className="mr-1.5 text-xs font-normal text-slate-400">
                            {i + 1}.
                          </span>
                          {x.nombre}
                        </p>
                        {x.detalle ? (
                          <p className="truncate text-xs text-slate-400">
                            {x.detalle}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-slate-900">
                          {valorPrincipal(x, orden)}
                        </p>
                        {x.semaforo ? <PillSemaforo s={x.semaforo} /> : null}
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${ancho}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[
                        orden !== "gasto" && fmtMoney(x.gasto),
                        orden !== "litros" && `${fmtNumber(x.litros, 0)} L`,
                        orden !== "cargas" &&
                          `${x.cargas} carga${x.cargas === 1 ? "" : "s"}`,
                        orden !== "km" &&
                          x.km > 0 &&
                          `${fmtNumber(x.km, 0)} km`,
                        orden !== "costoKm" &&
                          x.costoKm != null &&
                          fmtCostoKm(x.costoKm),
                        orden !== "l100" && x.l100 != null && fmtL100(x.l100),
                        vista === "vehiculos" &&
                          x.ref_l100 != null &&
                          `ref. ${fmtNumber(x.ref_l100, 1)}`,
                        (vista === "estaciones" || vista === "combustibles") &&
                          x.precioLitro != null &&
                          `${fmtMoney(x.precioLitro)}/L`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {ranking.length > 10 ? (
            <button
              type="button"
              className="btn-ghost w-full py-2 text-sm"
              onClick={() => setVerTodos((v) => !v)}
            >
              {verTodos ? "Ver menos" : `Ver todos (${ranking.length})`}
            </button>
          ) : null}

          {vista === "vehiculos" ? (
            <p className="text-[11px] leading-snug text-slate-400">
              Consumo y costo por km se calculan con los km recorridos entre
              cargas del periodo. El estado compara el consumo con la referencia
              del vehículo (Normal hasta +10%, Atención hasta +25%, Alto más de
              +25%); con menos de 2 tanques cargados figura como &ldquo;Pocos
              datos&rdquo;.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
