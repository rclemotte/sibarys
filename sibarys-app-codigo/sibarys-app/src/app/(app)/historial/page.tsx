import { createClient } from "@/lib/supabase/server";
import { tienePermiso } from "@/lib/permisos";
import type { Consumo } from "@/lib/types";
import { fmtNumber, fmtMoney, fmtDateTime } from "@/lib/format";
import Link from "next/link";
import { inicioDelDiaLocal } from "@/lib/format";
import EditarCargaForm, { type CargaEditable } from "./EditarCargaForm";
import AnularCargaForm from "./AnularCargaForm";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Fuel, SlidersHorizontal } from "lucide-react";
import Encabezado, { AccionEncabezado } from "@/components/ui/Encabezado";
import Etiqueta from "@/components/ui/Etiqueta";
import Vacio from "@/components/ui/Vacio";
import { colorVehiculo, sigla } from "@/lib/colorVehiculo";
import { hoyLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

type Params = {
  vehiculo?: string;
  chofer?: string;
  desde?: string;
  hasta?: string;
  anuladas?: string;
  pagina?: string;
};

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user!.id)
    .single();
  const puedeCorregir = tienePermiso(perfil, "puede_corregir_km");

  // Filtros (por la URL, así se pueden compartir y no se pierden al recargar)
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  const f = {
    vehiculo: searchParams.vehiculo || "",
    chofer: puedeCorregir ? searchParams.chofer || "" : "",
    desde: searchParams.desde && ymd.test(searchParams.desde) ? searchParams.desde : "",
    hasta: searchParams.hasta && ymd.test(searchParams.hasta) ? searchParams.hasta : "",
    anuladas: puedeCorregir && searchParams.anuladas === "1",
    pagina: Math.max(1, Number(searchParams.pagina) || 1),
  };
  const desdeIso = f.desde ? inicioDelDiaLocal(f.desde).toISOString() : null;
  const hastaIso = f.hasta
    ? new Date(inicioDelDiaLocal(f.hasta).getTime() + 86400000).toISOString()
    : null;
  const rango = [(f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA - 1] as const;

  let cargas: Consumo[] = [];
  let total = 0;
  type Anulada = {
    id: string;
    vehiculo_id: string;
    chofer_id: string | null;
    registrado_en: string;
    odometro_km: number;
    litros: number;
    costo_total: number | null;
    anulada_en: string;
    anulada_motivo: string | null;
    anulada_por: string | null;
  };
  let anuladas: Anulada[] = [];
  let faltaSql = false;

  if (!f.anuladas) {
    let q = supabase.from("consumo").select("*", { count: "exact" });
    if (f.vehiculo) q = q.eq("vehiculo_id", f.vehiculo);
    if (f.chofer) q = q.eq("chofer_id", f.chofer);
    if (desdeIso) q = q.gte("registrado_en", desdeIso);
    if (hastaIso) q = q.lt("registrado_en", hastaIso);
    const { data, count } = await q
      .order("registrado_en", { ascending: false })
      .range(rango[0], rango[1]);
    cargas = (data || []) as Consumo[];
    total = count ?? cargas.length;
  } else {
    let q = supabase
      .from("cargas")
      .select(
        "id, vehiculo_id, chofer_id, registrado_en, odometro_km, litros, costo_total, anulada_en, anulada_motivo, anulada_por",
        { count: "exact" },
      )
      .not("anulada_en", "is", null);
    if (f.vehiculo) q = q.eq("vehiculo_id", f.vehiculo);
    if (f.chofer) q = q.eq("chofer_id", f.chofer);
    if (desdeIso) q = q.gte("registrado_en", desdeIso);
    if (hastaIso) q = q.lt("registrado_en", hastaIso);
    const { data, count, error } = await q
      .order("anulada_en", { ascending: false })
      .range(rango[0], rango[1]);
    faltaSql = !!error;
    anuladas = (data || []) as Anulada[];
    total = count ?? anuladas.length;
  }

  // Opciones de los filtros
  const [{ data: optV }, { data: optP }] = await Promise.all([
    supabase.from("vehiculos").select("id, nombre, patente").order("nombre"),
    puedeCorregir
      ? supabase.from("perfiles").select("id, nombre_completo").order("nombre_completo")
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const nombreVeh = new Map(
    (optV || []).map((v: any) => [v.id as string, `${v.nombre} · ${v.patente}`]),
  );
  const nombrePersona = new Map(
    (optP || []).map((p: any) => [p.id as string, (p.nombre_completo as string) || "(sin nombre)"]),
  );
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const urlCon = (cambios: Partial<Record<keyof Params, string>>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = {
      vehiculo: f.vehiculo,
      chofer: f.chofer,
      desde: f.desde,
      hasta: f.hasta,
      anuladas: f.anuladas ? "1" : "",
      pagina: String(f.pagina),
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v && !(k === "pagina" && v === "1")) p.set(k, v);
    const qs = p.toString();
    return qs ? `/historial?${qs}` : "/historial";
  };
  const hayFiltros = !!(f.vehiculo || f.chofer || f.desde || f.hasta || f.anuladas);
  const idsCargas = cargas.map((c) => c.id);

  // Historial de correcciones de estas cargas (si la tabla todavía no
  // existe en la base, simplemente no se muestra nada)
  type Correccion = {
    carga_id: string;
    campo: string;
    valor_anterior: string | null;
    valor_nuevo: string | null;
    motivo: string;
    corregido_en: string;
    corregido_por: string | null;
  };
  const { data: corrData } =
    idsCargas.length > 0
      ? await supabase
          .from("cargas_correcciones")
          .select(
            "carga_id, campo, valor_anterior, valor_nuevo, motivo, corregido_en, corregido_por",
          )
          .in("carga_id", idsCargas)
          .order("corregido_en", { ascending: false })
      : { data: [] as Correccion[] };
  const correcciones = (corrData || []) as Correccion[];

  // Nombre de quien corrigió
  const idsCorrectores = Array.from(
    new Set(correcciones.map((c) => c.corregido_por).filter(Boolean)),
  ) as string[];
  const { data: correctores } =
    idsCorrectores.length > 0
      ? await supabase
          .from("perfiles")
          .select("id, nombre_completo")
          .in("id", idsCorrectores)
      : { data: [] as { id: string; nombre_completo: string | null }[] };
  const nombreDe = new Map(
    (correctores || []).map((p: any) => [p.id as string, p.nombre_completo]),
  );

  // Agrupa por carga y por edición (misma fecha + motivo)
  const edicionesPorCarga = new Map<
    string,
    { en: string; motivo: string; por: string | null; cambios: Correccion[] }[]
  >();
  for (const c of correcciones) {
    const lista = edicionesPorCarga.get(c.carga_id) || [];
    let ed = lista.find(
      (e) => e.en === c.corregido_en && e.motivo === c.motivo,
    );
    if (!ed) {
      ed = {
        en: c.corregido_en,
        motivo: c.motivo,
        por: c.corregido_por ? (nombreDe.get(c.corregido_por) ?? null) : null,
        cambios: [],
      };
      lista.push(ed);
    }
    ed.cambios.push(c);
    edicionesPorCarga.set(c.carga_id, lista);
  }

  // Datos para el formulario de edición (solo si puede editar)
  let editables = new Map<string, CargaEditable>();
  let optVehiculos: { id: string; nombre: string }[] = [];
  let optCombustibles: { id: string; nombre: string }[] = [];
  let optEstaciones: { id: string; nombre: string }[] = [];
  let optChoferes: { id: string; nombre: string }[] = [];
  let optEmblemas: { id: string; nombre: string }[] = [];
  if (puedeCorregir && idsCargas.length > 0) {
    const [
      { data: crudas },
      { data: vs },
      { data: ts },
      { data: es },
      { data: ps },
      { data: embs },
    ] = await Promise.all([
        (async () => {
          const base =
            "id, vehiculo_id, chofer_id, registrado_en, tipo_combustible_id, estacion_id, odometro_km, litros, costo_total, tanque_lleno, notas";
          const r = await supabase
            .from("cargas")
            .select(base + ", emblema_id")
            .in("id", idsCargas);
          // Si todavía no existe la columna emblema_id (falta el SQL)
          return r.error
            ? await supabase.from("cargas").select(base).in("id", idsCargas)
            : r;
        })(),
        supabase
          .from("vehiculos")
          .select("id, nombre, patente")
          .order("nombre"),
        supabase.from("tipos_combustible").select("id, nombre").order("nombre"),
        supabase
          .from("estaciones_servicio")
          .select("id, nombre, localidad, emblemas(nombre)")
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("perfiles")
          .select("id, nombre_completo")
          .order("nombre_completo"),
        supabase.from("emblemas").select("id, nombre").order("nombre"),
      ]);
    optEmblemas = (embs || []).map((e: any) => ({ id: e.id, nombre: e.nombre }));
    optChoferes = (ps || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre_completo || "(sin nombre)",
    }));
    editables = new Map(
      ((crudas || []) as any[]).map((c) => [
        c.id as string,
        {
          ...c,
          odometro_km: Number(c.odometro_km),
          litros: Number(c.litros),
          costo_total: c.costo_total != null ? Number(c.costo_total) : null,
        } as CargaEditable,
      ]),
    );
    optVehiculos = (vs || []).map((v: any) => ({
      id: v.id,
      nombre: `${v.nombre} — ${v.patente}`,
    }));
    optCombustibles = (ts || []).map((t: any) => ({
      id: t.id,
      nombre: t.nombre,
    }));
    optEstaciones = (es || []).map((e: any) => ({
      id: e.id,
      nombre: `${e.nombre}${e.emblemas?.nombre ? ` — ${e.emblemas.nombre}` : ""}${
        e.localidad ? ` (${e.localidad})` : ""
      }`,
    }));
  }

  // Atajos de fecha (chips)
  const hoy = hoyLocal();
  const [hy, hm] = hoy.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const mesActual = { desde: `${hy}-${pad(hm)}-01`, hasta: hoy };
  const pmY = hm === 1 ? hy - 1 : hy;
  const pmM = hm === 1 ? 12 : hm - 1;
  const mesPasado = {
    desde: `${pmY}-${pad(pmM)}-01`,
    hasta: `${pmY}-${pad(pmM)}-${pad(new Date(Date.UTC(pmY, pmM, 0)).getUTCDate())}`,
  };
  const chipFecha = (r: { desde: string; hasta: string } | null) =>
    !f.anuladas && (r ? f.desde === r.desde && f.hasta === r.hasta : !f.desde && !f.hasta);

  // Agrupar por mes (hora de Paraguay)
  const mesDe = (iso: string) => {
    const t = new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Asuncion", month: "long", year: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const grupos: { mes: string; filas: Consumo[] }[] = [];
  for (const r of cargas) {
    const m = mesDe(r.registrado_en);
    const g = grupos[grupos.length - 1];
    if (g && g.mes === m) g.filas.push(r);
    else grupos.push({ mes: m, filas: [r] });
  }

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Historial"
        subtitulo={
          f.anuladas
            ? `${fmtNumber(total)} ${total === 1 ? "carga anulada" : "cargas anuladas"}`
            : hayFiltros
              ? `${fmtNumber(total)} ${total === 1 ? "carga" : "cargas"} con esos filtros`
              : `${fmtNumber(total)} cargas, de la más nueva a la más vieja`
        }
        accion={<AccionEncabezado href="/cargar" etiqueta="Nueva carga" icono={<Fuel size={22} strokeWidth={2.4} />} />}
      >
        <nav aria-label="Filtros rápidos" className="sin-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
          {[
            ["Todas", urlCon({ desde: "", hasta: "", anuladas: "", pagina: "1" }), chipFecha(null) && !f.vehiculo && !f.chofer],
            ["Este mes", urlCon({ ...mesActual, anuladas: "", pagina: "1" }), chipFecha(mesActual)],
            ["Mes pasado", urlCon({ ...mesPasado, anuladas: "", pagina: "1" }), chipFecha(mesPasado)],
            ...(puedeCorregir ? [["Anuladas", urlCon({ anuladas: "1", pagina: "1" }), f.anuladas] as const] : []),
          ].map(([t, href, on]) => (
            <Link
              key={t as string}
              href={href as string}
              className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-sm font-extrabold transition active:scale-95 ${
                on ? "bg-marca text-tinta shadow-boton" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {t as string}
              {on && !f.anuladas ? <span className="ml-1.5 rounded-full bg-white/60 px-1.5 text-xs">{fmtNumber(total)}</span> : null}
            </Link>
          ))}
        </nav>
      </Encabezado>

      <details className="card group p-0" open={!!(f.vehiculo || f.chofer)}>
        <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-5 font-extrabold [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-suave text-brand">
            <SlidersHorizontal size={18} strokeWidth={2.6} />
          </span>
          Buscar por vehículo, chofer o fechas
          {f.vehiculo || f.chofer ? <Etiqueta tono="marca">Filtros activos</Etiqueta> : null}
          <ChevronDown size={20} strokeWidth={2.6} className="ml-auto text-tenue transition group-open:rotate-180" />
        </summary>
        <form method="get" action="/historial" className="grid gap-4 border-t border-linea px-5 pb-5 pt-4 lg:grid-cols-4 lg:items-end">
          <div>
            <label className="label">Vehículo</label>
            <select name="vehiculo" className="field" defaultValue={f.vehiculo}>
              <option value="">Todos</option>
              {(optV || []).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} · {v.patente}
                </option>
              ))}
            </select>
          </div>
          {puedeCorregir ? (
            <div>
              <label className="label">Chofer</label>
              <select name="chofer" className="field" defaultValue={f.chofer}>
                <option value="">Todos</option>
                {(optP || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo || "(sin nombre)"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <div>
              <label className="label">Desde</label>
              <input type="date" name="desde" className="field" defaultValue={f.desde} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" name="hasta" className="field" defaultValue={f.hasta} />
            </div>
          </div>
          {f.anuladas ? <input type="hidden" name="anuladas" value="1" /> : null}
          <div className="flex gap-3 lg:col-span-4 lg:justify-end">
            <Link href="/historial" className="btn-ghost flex-1 lg:flex-none">
              Limpiar
            </Link>
            <button type="submit" className="btn-primary flex-1 lg:flex-none">
              Buscar
            </button>
          </div>
        </form>
      </details>

      {f.anuladas ? (
        faltaSql ? (
          <Vacio
            icono={<ClipboardList size={26} strokeWidth={2.4} />}
            titulo="Falta un ajuste en la base"
            texto="Para ver y anular cargas falta correr el SQL migracion_anular_cargas.sql en Supabase."
          />
        ) : anuladas.length === 0 ? (
          <Vacio
            icono={<ClipboardList size={26} strokeWidth={2.4} />}
            titulo="No hay cargas anuladas"
            texto={hayFiltros ? "Probá con otras fechas o sacá los filtros." : undefined}
          />
        ) : (
          <ul className="card divide-y divide-linea p-0">
            {anuladas.map((a) => (
              <li key={a.id} className="px-4 py-4 lg:px-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error-suave font-display text-sm font-extrabold text-error">
                    {sigla(nombreVeh.get(a.vehiculo_id)?.split(" · ")[1])}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-extrabold">
                      {nombreVeh.get(a.vehiculo_id) ?? "—"} <Etiqueta tono="error">Anulada</Etiqueta>
                    </p>
                    <p className="text-xs font-semibold text-suave">
                      {fmtDateTime(a.registrado_en)} · {a.chofer_id ? (nombrePersona.get(a.chofer_id) ?? "—") : "—"} ·{" "}
                      {fmtNumber(Number(a.litros), 2)} L · {fmtNumber(Number(a.odometro_km))} km
                      {a.costo_total != null ? ` · ${fmtMoney(Number(a.costo_total))}` : ""}
                    </p>
                    <p className="mt-2 rounded-xl bg-error-suave px-3 py-2 text-xs font-bold text-error">
                      Motivo: {a.anulada_motivo ?? "—"}
                      <span className="block font-semibold">
                        {a.anulada_por ? `${nombrePersona.get(a.anulada_por) ?? ""} · ` : ""}
                        {fmtDateTime(a.anulada_en)}
                      </span>
                    </p>
                    <AnularCargaForm id={a.id} anular={false} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : cargas.length === 0 ? (
        <Vacio
          icono={<Fuel size={26} strokeWidth={2.4} />}
          titulo={hayFiltros ? "No hay cargas con esos filtros" : "Todavía no hay cargas"}
          texto={hayFiltros ? "Probá con otras fechas o sacá los filtros." : "Cuando registres una carga, aparece acá."}
          accion={
            hayFiltros ? (
              <Link href="/historial" className="btn-ghost">
                Ver todas
              </Link>
            ) : (
              <Link href="/cargar" className="btn-primary">
                Cargar combustible
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.mes}>
              <h2 className="mb-2 px-1 font-display text-lg font-extrabold">{g.mes}</h2>
              <div className="card p-0">
                <div className="hidden grid-cols-[2.4fr_1.6fr_1fr_1.2fr_1.3fr_28px] gap-3 border-b border-linea px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-tenue lg:grid">
                  <span>Vehículo · fecha</span>
                  <span>Chofer · estación</span>
                  <span className="text-right">Litros</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Consumo</span>
                  <span />
                </div>
                <ul className="divide-y divide-linea">
                  {g.filas.map((r) => {
                    const anomalia =
                      r.litros_por_100km != null && (r.litros_por_100km < 3 || r.litros_por_100km > 50);
                    const ediciones = edicionesPorCarga.get(r.id) || [];
                    const editada = ediciones.length > 0 || !!r.odometro_corregido_en;
                    const estadoBadge =
                      r.litros_por_100km == null ? (
                        <Etiqueta tono="neutro">1ª carga</Etiqueta>
                      ) : anomalia ? (
                        <Etiqueta tono="error">Fuera de rango</Etiqueta>
                      ) : (
                        <Etiqueta tono="ok">Normal</Etiqueta>
                      );
                    return (
                      <li key={r.id}>
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-fondo/60 lg:grid lg:grid-cols-[2.4fr_1.6fr_1fr_1.2fr_1.3fr_28px] lg:px-5 [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ${colorVehiculo(r.vehiculo_id)}`}
                              >
                                {sigla(r.patente)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-extrabold">
                                  {r.vehiculo_nombre}{" "}
                                  <span className="text-xs font-bold text-tenue">{r.patente}</span>
                                </p>
                                <p className="truncate text-xs font-semibold text-suave">
                                  {fmtDateTime(r.registrado_en)}
                                  <span className="lg:hidden">
                                    {" "}
                                    · {fmtNumber(Number(r.litros), 2)} L
                                    {r.estacion ? ` · ${r.estacion.split(" · ")[0]}` : ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="hidden min-w-0 lg:block">
                              <p className="truncate text-sm font-bold">{r.chofer_nombre ?? "—"}</p>
                              <p className="truncate text-xs font-semibold text-suave">{r.estacion ?? "—"}</p>
                            </div>
                            <p className="hidden text-right font-bold tabular-nums lg:block">{fmtNumber(Number(r.litros), 2)} L</p>
                            <p className="hidden text-right font-bold tabular-nums lg:block">
                              {r.costo_total != null ? fmtMoney(r.costo_total) : "—"}
                            </p>
                            <div className="shrink-0 text-right">
                              <p className="font-display text-base font-extrabold leading-tight tabular-nums">
                                {r.litros_por_100km != null ? `${fmtNumber(r.litros_por_100km, 1)} L/100` : "—"}
                              </p>
                              <div className="mt-0.5 flex justify-end gap-1">
                                {editada ? <Etiqueta tono="oro">Editada</Etiqueta> : null}
                                {estadoBadge}
                              </div>
                            </div>
                            <ChevronDown
                              size={20}
                              strokeWidth={2.6}
                              className="hidden shrink-0 text-tenue transition group-open:rotate-180 lg:block"
                            />
                          </summary>

                          <div className="space-y-3 bg-fondo/60 px-4 pb-4 pt-3 lg:px-5">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-white p-4 text-sm sm:grid-cols-4">
                              {[
                                ["Odómetro", `${fmtNumber(r.odometro_km)} km`],
                                ["Recorrido", r.distancia_km != null ? `${fmtNumber(r.distancia_km)} km` : "—"],
                                ["Litros", `${fmtNumber(Number(r.litros), 2)} L`],
                                ["Total", r.costo_total != null ? fmtMoney(r.costo_total) : "—"],
                                ["Precio por litro", r.precio_litro != null ? fmtMoney(r.precio_litro) : "—"],
                                ["Combustible", r.combustible_nombre ?? "—"],
                                ["Chofer", r.chofer_nombre ?? "—"],
                                ["Tanque lleno", r.tanque_lleno ? "Sí" : "No"],
                              ].map(([k, v]) => (
                                <div key={k}>
                                  <dt className="text-xs font-bold text-tenue">{k}</dt>
                                  <dd className="font-extrabold">{v}</dd>
                                </div>
                              ))}
                              <div className="col-span-2 sm:col-span-4">
                                <dt className="text-xs font-bold text-tenue">Estación</dt>
                                <dd className="font-extrabold">{r.estacion ?? "—"}</dd>
                              </div>
                            </dl>

                            {r.odometro_corregido_en ? (
                              <p className="rounded-xl bg-oro-suave px-3 py-2 text-xs font-bold text-oro-dark">
                                Km corregido
                                {r.odometro_original != null ? ` (antes ${fmtNumber(r.odometro_original)} km)` : ""}
                                {r.odometro_corregido_motivo ? `: ${r.odometro_corregido_motivo}` : ""}
                                <span className="block font-semibold">
                                  {r.odometro_corregido_por_nombre ? `${r.odometro_corregido_por_nombre} · ` : ""}
                                  {fmtDateTime(r.odometro_corregido_en)}
                                </span>
                              </p>
                            ) : null}

                            {ediciones.map((ed, i) => (
                              <div key={i} className="rounded-xl bg-oro-suave px-3 py-2 text-xs font-semibold text-oro-dark">
                                <p className="font-extrabold">
                                  {ed.cambios.some((c) => c.campo === "Registro")
                                    ? `Registrada por administración: ${ed.motivo}`
                                    : ed.cambios.some((c) => c.campo === "Restauración")
                                      ? `Restaurada (estuvo anulada): ${ed.motivo}`
                                      : ed.cambios.some((c) => c.campo === "Anulación")
                                        ? `Estuvo anulada: ${ed.motivo}`
                                        : `Carga corregida: ${ed.motivo}`}
                                </p>
                                {ed.cambios
                                  .filter((c) => c.campo !== "Registro" && c.campo !== "Restauración" && c.campo !== "Anulación")
                                  .map((c, j) => (
                                    <p key={j}>
                                      {c.campo}: {c.valor_anterior ?? "—"} → <span className="font-extrabold">{c.valor_nuevo ?? "—"}</span>
                                    </p>
                                  ))}
                                <p>
                                  {ed.por ? `${ed.por} · ` : ""}
                                  {fmtDateTime(ed.en)}
                                </p>
                              </div>
                            ))}

                            {puedeCorregir ? (
                              <div className="flex flex-wrap items-start gap-2">
                                {editables.get(r.id) ? (
                                  <EditarCargaForm
                                    carga={editables.get(r.id)!}
                                    vehiculos={optVehiculos}
                                    combustibles={optCombustibles}
                                    estaciones={optEstaciones}
                                    choferes={optChoferes}
                                    emblemas={optEmblemas}
                                  />
                                ) : null}
                                <AnularCargaForm id={r.id} anular />
                              </div>
                            ) : null}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      {paginas > 1 ? (
        <div className="flex items-center justify-between gap-2">
          {f.pagina > 1 ? (
            <Link href={urlCon({ pagina: String(f.pagina - 1) })} className="btn-ghost">
              <ChevronLeft size={18} strokeWidth={2.6} /> Más nuevas
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm font-bold text-suave">
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas ? (
            <Link href={urlCon({ pagina: String(f.pagina + 1) })} className="btn-ghost">
              Ver más <ChevronRight size={18} strokeWidth={2.6} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
