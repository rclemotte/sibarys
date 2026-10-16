"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { fmtNumber, fmtDate } from "@/lib/format";
import {
  AVISO_KM,
  INTERVALO_SUGERIDO_KM,
  ordenarPorUrgencia,
  type EstadoMant,
  type FilaConEstado,
} from "@/lib/mantenimiento";
import { registrarMantenimiento, type MantState } from "./actions";

export type RegistroMant = {
  id: string;
  vehiculo_id: string;
  fecha: string;
  km: number;
  km_proximo: number;
  descripcion: string;
  por: string | null;
};

const ESTADO: Record<
  EstadoMant,
  { label: string; icono: string; clase: string }
> = {
  vencido: { label: "Vencido", icono: "▲", clase: "bg-red-50 text-red-800" },
  proximo: {
    label: "Próximo",
    icono: "!",
    clase: "bg-amber-50 text-amber-800",
  },
  al_dia: {
    label: "Al día",
    icono: "✓",
    clase: "bg-emerald-50 text-emerald-800",
  },
  sin_registro: {
    label: "Sin registro",
    icono: "…",
    clase: "bg-slate-100 text-slate-500",
  },
};

function Pill({ e }: { e: EstadoMant }) {
  const x = ESTADO[e];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.clase}`}
    >
      <span aria-hidden="true">{x.icono}</span>
      {x.label}
    </span>
  );
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "Guardando…" : "Guardar mantenimiento"}
    </button>
  );
}

function textoFaltan(f: FilaConEstado): string {
  if (f.faltan == null) return "Sin mantenimiento registrado";
  if (f.faltan <= 0) return `Se pasó ${fmtNumber(-f.faltan, 0)} km`;
  return `Faltan ${fmtNumber(f.faltan, 0)} km`;
}

export default function MantenimientoPanel({
  filas,
  registros,
  hoy,
}: {
  filas: FilaConEstado[];
  registros: RegistroMant[];
  hoy: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vehiculoId, setVehiculoId] = useState("");
  const [km, setKm] = useState("");
  const [kmProx, setKmProx] = useState("");
  const [verHist, setVerHist] = useState<string | null>(null);
  const [state, action] = useFormState<MantState, FormData>(
    registrarMantenimiento,
    {},
  );

  const ordenadas = useMemo(() => ordenarPorUrgencia(filas), [filas]);
  const cuenta = (e: EstadoMant) => filas.filter((f) => f.estado === e).length;

  // Al elegir vehículo: propone su km actual y el próximo (+10.000)
  function elegirVehiculo(id: string) {
    setVehiculoId(id);
    const f = filas.find((x) => x.vehiculo_id === id);
    const actual = f?.km_actual ?? f?.ultimo_km ?? null;
    setKm(actual != null ? String(Math.round(actual)) : "");
    setKmProx(
      actual != null ? String(Math.round(actual) + INTERVALO_SUGERIDO_KM) : "",
    );
  }

  function abrirPara(id: string) {
    setAbierto(true);
    elegirVehiculo(id);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (state.success) {
      setVehiculoId("");
      setKm("");
      setKmProx("");
    }
  }, [state]);

  const opciones = useMemo(
    () =>
      [...filas].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { numeric: true }),
      ),
    [filas],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-700">
          Mantenimiento
        </h2>
        <p className="text-sm text-slate-500">
          El km actual sale de la última carga de combustible. Avisa cuando
          faltan {fmtNumber(AVISO_KM, 0)} km o menos.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {(["vencido", "proximo", "al_dia", "sin_registro"] as EstadoMant[]).map(
          (e) => (
            <div key={e} className="card px-1 py-2">
              <p className="text-lg font-bold text-slate-900">{cuenta(e)}</p>
              <p className="text-[10px] leading-tight text-slate-500">
                {ESTADO[e].label}
              </p>
            </div>
          ),
        )}
      </div>

      {/* Registrar */}
      {!abierto ? (
        <button className="btn-primary w-full" onClick={() => setAbierto(true)}>
          + Registrar mantenimiento
        </button>
      ) : (
        <form action={action} className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">
            Registrar mantenimiento
          </h3>
          <div>
            <label className="label">Vehículo</label>
            <select
              name="vehiculo_id"
              className="field"
              value={vehiculoId}
              onChange={(e) => elegirVehiculo(e.target.value)}
              required
            >
              <option value="">Elegí…</option>
              {opciones.map((f) => (
                <option key={f.vehiculo_id} value={f.vehiculo_id}>
                  {f.nombre} — {f.patente}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Fecha</label>
              <input
                name="fecha"
                type="date"
                className="field"
                defaultValue={hoy}
                max={hoy}
                required
              />
            </div>
            <div>
              <label className="label">Km al hacerlo</label>
              <input
                name="km"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="field"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Km del próximo mantenimiento</label>
            <input
              name="km_proximo"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className="field"
              value={kmProx}
              onChange={(e) => setKmProx(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Se propone el km actual + {fmtNumber(INTERVALO_SUGERIDO_KM, 0)}.
              Cambialo si corresponde.
            </p>
          </div>
          <div>
            <label className="label">Qué se le hizo</label>
            <textarea
              name="descripcion"
              rows={2}
              className="field"
              placeholder="Ej. cambio de aceite y filtros, revisión de frenos"
              required
              minLength={3}
            />
          </div>

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {state.success}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost flex-1"
              onClick={() => setAbierto(false)}
            >
              Cerrar
            </button>
            <Guardar />
          </div>
        </form>
      )}

      {/* Lista por urgencia */}
      <ul className="space-y-2">
        {ordenadas.map((f) => {
          const hist = registros.filter((r) => r.vehiculo_id === f.vehiculo_id);
          const abiertoHist = verHist === f.vehiculo_id;
          if (f.estado === "sin_registro")
            return (
              <li
                key={f.vehiculo_id}
                className="card flex items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {f.nombre}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {f.patente}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Sin registro ·{" "}
                    {f.km_actual != null
                      ? `${fmtNumber(f.km_actual, 0)} km`
                      : "sin cargas"}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  onClick={() => abrirPara(f.vehiculo_id)}
                >
                  Registrar
                </button>
              </li>
            );
          return (
            <li key={f.vehiculo_id} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {f.nombre}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {f.patente}
                    </span>
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      f.estado === "vencido"
                        ? "text-red-700"
                        : f.estado === "proximo"
                          ? "text-amber-700"
                          : "text-slate-600"
                    }`}
                  >
                    {textoFaltan(f)}
                  </p>
                </div>
                <Pill e={f.estado} />
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs">
                <div>
                  <p className="text-slate-400">Km actual</p>
                  <p className="font-medium text-slate-700">
                    {f.km_actual != null
                      ? `${fmtNumber(f.km_actual, 0)} km`
                      : "Sin cargas"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Próximo mantenimiento</p>
                  <p className="font-medium text-slate-700">
                    {f.km_proximo != null
                      ? `${fmtNumber(f.km_proximo, 0)} km`
                      : "—"}
                  </p>
                </div>
              </div>

              {f.ultimo_fecha ? (
                <p className="text-xs text-slate-500">
                  Último: {fmtDate(`${f.ultimo_fecha}T12:00:00`)} a los{" "}
                  {fmtNumber(f.ultimo_km, 0)} km — {f.ultimo_descripcion}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  onClick={() => abrirPara(f.vehiculo_id)}
                >
                  Registrar mantenimiento
                </button>
                {hist.length > 1 ? (
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand"
                    onClick={() =>
                      setVerHist(abiertoHist ? null : f.vehiculo_id)
                    }
                  >
                    {abiertoHist
                      ? "Ocultar historial"
                      : `Ver historial (${hist.length})`}
                  </button>
                ) : null}
              </div>

              {abiertoHist ? (
                <ul className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {hist.map((h) => (
                    <li key={h.id}>
                      <span className="font-medium">
                        {fmtDate(`${h.fecha}T12:00:00`)}
                      </span>{" "}
                      · {fmtNumber(h.km, 0)} km · próximo{" "}
                      {fmtNumber(h.km_proximo, 0)} km — {h.descripcion}
                      {h.por ? (
                        <span className="text-slate-400"> ({h.por})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
