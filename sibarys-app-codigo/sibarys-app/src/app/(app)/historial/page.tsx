import { createClient } from "@/lib/supabase/server";
import { tienePermiso } from "@/lib/permisos";
import type { Consumo } from "@/lib/types";
import { fmtNumber, fmtMoney, fmtDateTime } from "@/lib/format";
import EditarCargaForm, { type CargaEditable } from "./EditarCargaForm";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
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

  const { data } = await supabase
    .from("consumo")
    .select("*")
    .order("registrado_en", { ascending: false })
    .limit(100);

  const cargas = (data || []) as Consumo[];
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
  if (puedeCorregir && idsCargas.length > 0) {
    const [{ data: crudas }, { data: vs }, { data: ts }, { data: es }] =
      await Promise.all([
        supabase
          .from("cargas")
          .select(
            "id, vehiculo_id, tipo_combustible_id, estacion_id, odometro_km, litros, costo_total, tanque_lleno, notas",
          )
          .in("id", idsCargas),
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
      ]);
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
                      Carga corregida: {ed.motivo}
                    </p>
                    {ed.cambios.map((c, j) => (
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
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
