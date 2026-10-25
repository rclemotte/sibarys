import { createClient } from "@/lib/supabase/server";
import { tienePermiso } from "@/lib/permisos";
import type { Consumo } from "@/lib/types";
import { fmtNumber, fmtMoney, fmtDateTime } from "@/lib/format";
import Link from "next/link";
import { inicioDelDiaLocal } from "@/lib/format";
import EditarCargaForm, { type CargaEditable } from "./EditarCargaForm";
import AnularCargaForm from "./AnularCargaForm";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Historial</h1>
        <p className="text-sm text-slate-500">
          {f.anuladas
            ? `${fmtNumber(total)} carga(s) anulada(s).`
            : hayFiltros
              ? `${fmtNumber(total)} carga(s) con esos filtros.`
              : `${fmtNumber(total)} cargas en total, de la más nueva a la más vieja.`}
        </p>
      </div>

      <details className="card" open={hayFiltros}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Buscar cargas {hayFiltros ? "· filtros activos" : ""}
        </summary>
        <form method="get" action="/historial" className="mt-3 space-y-3">
          <div className={`grid gap-3 ${puedeCorregir ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="label">Vehículo</label>
              <select name="vehiculo" className="field" defaultValue={f.vehiculo}>
                <option value="">Todos</option>
                {(optV || []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} — {v.patente}
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde</label>
              <input type="date" name="desde" className="field" defaultValue={f.desde} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" name="hasta" className="field" defaultValue={f.hasta} />
            </div>
          </div>
          {puedeCorregir ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="anuladas"
                value="1"
                defaultChecked={f.anuladas}
                className="h-4 w-4 accent-brand"
              />
              Ver solo las cargas anuladas
            </label>
          ) : null}
          <div className="flex gap-2">
            <Link href="/historial" className="btn-ghost flex-1 text-center">
              Limpiar
            </Link>
            <button type="submit" className="btn-primary flex-1">
              Buscar
            </button>
          </div>
        </form>
      </details>

      {f.anuladas ? (
        faltaSql ? (
          <div className="card text-center text-sm text-amber-700">
            Para ver y anular cargas falta correr el SQL
            migracion_anular_cargas.sql en Supabase.
          </div>
        ) : anuladas.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            No hay cargas anuladas{hayFiltros ? " con esos filtros" : ""}.
          </div>
        ) : (
          <ul className="space-y-2">
            {anuladas.map((a) => (
              <li key={a.id} className="card border-red-200 bg-red-50/40">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {nombreVeh.get(a.vehiculo_id) ?? "—"}{" "}
                      <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        ANULADA
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {fmtDateTime(a.registrado_en)} ·{" "}
                      {a.chofer_id ? (nombrePersona.get(a.chofer_id) ?? "—") : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmtNumber(Number(a.litros), 1)} L</p>
                    <p className="text-xs text-slate-500">
                      {fmtNumber(Number(a.odometro_km))} km
                      {a.costo_total != null ? ` · ${fmtMoney(Number(a.costo_total))}` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-red-800">
                  Anulada: {a.anulada_motivo ?? "—"}
                  <span className="block text-red-600">
                    {a.anulada_por ? `${nombrePersona.get(a.anulada_por) ?? ""} · ` : ""}
                    {fmtDateTime(a.anulada_en)}
                  </span>
                </p>
                <AnularCargaForm id={a.id} anular={false} />
              </li>
            ))}
          </ul>
        )
      ) : cargas.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          {hayFiltros ? "No hay cargas con esos filtros." : "No hay cargas registradas."}
        </div>
      ) : (
        <ul className="space-y-2">
          {cargas.map((r) => {
            const anomalia =
              r.litros_por_100km != null &&
              (r.litros_por_100km < 3 || r.litros_por_100km > 50);
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
                      {r.litros_por_100km != null
                        ? `${fmtNumber(r.litros_por_100km, 1)} L/100 km`
                        : "1ª carga"}
                      {anomalia ? " ⚠️" : ""}
                    </p>
                  </div>
                </div>

                {r.odometro_corregido_en ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Km corregido
                    {r.odometro_original != null
                      ? ` (antes ${fmtNumber(r.odometro_original)} km)`
                      : ""}
                    {r.odometro_corregido_motivo
                      ? `: ${r.odometro_corregido_motivo}`
                      : ""}
                    <span className="block text-amber-600">
                      {r.odometro_corregido_por_nombre
                        ? `${r.odometro_corregido_por_nombre} · `
                        : ""}
                      {fmtDateTime(r.odometro_corregido_en)}
                    </span>
                  </p>
                ) : null}

                {(edicionesPorCarga.get(r.id) || []).map((ed, i) => (
                  <div
                    key={i}
                    className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  >
                    <p className="font-semibold">
                      {ed.cambios.some((c) => c.campo === "Registro")
                        ? `Registrada por administración: ${ed.motivo}`
                        : ed.cambios.some((c) => c.campo === "Restauración")
                          ? `Restaurada (estuvo anulada): ${ed.motivo}`
                          : ed.cambios.some((c) => c.campo === "Anulación")
                            ? `Estuvo anulada: ${ed.motivo}`
                          : `Carga corregida: ${ed.motivo}`}
                    </p>
                    {ed.cambios
                      .filter(
                        (c) =>
                          c.campo !== "Registro" &&
                          c.campo !== "Restauración" &&
                          c.campo !== "Anulación",
                      )
                      .map((c, j) => (
                      <p key={j}>
                        {c.campo}: {c.valor_anterior ?? "—"} →{" "}
                        <span className="font-medium">
                          {c.valor_nuevo ?? "—"}
                        </span>
                      </p>
                    ))}
                    <p className="text-amber-600">
                      {ed.por ? `${ed.por} · ` : ""}
                      {fmtDateTime(ed.en)}
                    </p>
                  </div>
                ))}

                {puedeCorregir && editables.get(r.id) ? (
                  <EditarCargaForm
                    carga={editables.get(r.id)!}
                    vehiculos={optVehiculos}
                    combustibles={optCombustibles}
                    estaciones={optEstaciones}
                    choferes={optChoferes}
                    emblemas={optEmblemas}
                  />
                ) : null}
                {puedeCorregir ? <AnularCargaForm id={r.id} anular /> : null}
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          {f.pagina > 1 ? (
            <Link href={urlCon({ pagina: String(f.pagina - 1) })} className="btn-ghost">
              ← Más nuevas
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas ? (
            <Link href={urlCon({ pagina: String(f.pagina + 1) })} className="btn-ghost">
              Más viejas →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
