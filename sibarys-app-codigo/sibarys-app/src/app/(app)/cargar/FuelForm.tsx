"use client";

import { fechaHoraLocalInput } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearCarga, type CargarState } from "./actions";
import type { VehiculoParaCarga, EstacionParaCarga } from "@/lib/types";
import Combobox from "@/components/Combobox";

/** Opción especial del buscador: la estación no está en la lista. */
const OTRA = "__otra__";

// Muestra un número entero con separadores de miles (ej. 250000 -> "250.000")
function fmtMiles(raw: string): string {
  if (!raw) return "";
  return Number(raw).toLocaleString("es-AR");
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar carga"}
    </button>
  );
}

export default function FuelForm({
  vehiculos,
  estaciones,
  emblemas,
  choferes,
}: {
  vehiculos: VehiculoParaCarga[];
  estaciones: EstacionParaCarga[];
  emblemas: { id: string; nombre: string }[];
  /** Solo para administración: permite registrar cargas olvidadas. */
  choferes?: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useFormState<CargarState, FormData>(crearCarga, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Evita doble envío: un doble toque rápido en el celular puede mandar el
  // formulario dos veces antes de que el botón llegue a bloquearse.
  const enviando = useRef(false);
  useEffect(() => {
    enviando.current = false; // llegó la respuesta del servidor
  }, [state]);

  const [vehiculoId, setVehiculoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [odometro, setOdometro] = useState(""); // solo dígitos
  const [litros, setLitros] = useState("");
  const [total, setTotal] = useState(""); // solo dígitos
  const [estacionId, setEstacionId] = useState("");
  const [faltaEstacion, setFaltaEstacion] = useState(false);
  const esOtra = estacionId === OTRA;
  const [olvidada, setOlvidada] = useState(false);
  const [choferId, setChoferId] = useState("");
  const [fecha, setFecha] = useState("");

  const vehiculo = useMemo(
    () => vehiculos.find((v) => v.id === vehiculoId),
    [vehiculos, vehiculoId]
  );
  const combustibles = vehiculo?.combustibles ?? [];

  // Precio por litro = total ÷ litros (se calcula solo)
  const precioLitro = useMemo(() => {
    const l = Number(litros);
    const t = Number(total);
    if (l > 0 && t > 0) return t / l;
    return null;
  }, [litros, total]);

  // Opciones del buscador de estación (memorizadas para no reiniciar el texto)
  const opcionesEstaciones = useMemo(
    () => [
      ...estaciones.map((e) => ({
        id: e.id,
        nombre: `${e.nombre}${
          e.emblema_nombre ? ` — ${e.emblema_nombre}` : ""
        }${e.localidad ? ` (${e.localidad})` : ""}`,
      })),
      { id: OTRA, nombre: "➕ Otra estación (no está en la lista)" },
    ],
    [estaciones]
  );

  // Al cambiar de vehículo: si tiene un solo combustible, lo autoselecciona
  useEffect(() => {
    if (combustibles.length === 1) {
      setTipoId(combustibles[0].id);
    } else {
      setTipoId("");
    }
  }, [vehiculoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setVehiculoId("");
      setTipoId("");
      setOdometro("");
      setLitros("");
      setTotal("");
      setEstacionId("");
      setChoferId("");
      setFecha("");
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.success]);

  const hoy = fechaHoraLocalInput();

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (enviando.current) {
          e.preventDefault();
          return;
        }
        if (!estacionId) {
          e.preventDefault();
          setFaltaEstacion(true);
          return;
        }
        enviando.current = true;
      }}
      className="space-y-4"
    >
      {state.success ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <span className="text-xl" aria-hidden="true">
            ✅
          </span>
          <span className="font-semibold">{state.success}</span>
        </div>
      ) : null}
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      ) : null}
      {choferes ? (
        <div
          className={`card space-y-3 ${
            olvidada ? "border-amber-300 bg-amber-50/60" : ""
          }`}
        >
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand"
              checked={olvidada}
              onChange={(e) => setOlvidada(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">
              Registrar una carga que un chofer se olvidó de cargar
            </span>
          </label>
          {olvidada ? (
            <>
              <input type="hidden" name="modo" value="olvidada" />
              <input type="hidden" name="chofer_id" value={choferId} />
              <div>
                <label className="label">Chofer que hizo la carga</label>
                <Combobox
                  options={choferes}
                  value={choferId}
                  onChange={setChoferId}
                  placeholder="Buscar chofer…"
                />
              </div>
              <div>
                <label className="label" htmlFor="registrado_en">
                  Fecha y hora real de la carga
                </label>
                <input
                  id="registrado_en"
                  name="registrado_en"
                  type="datetime-local"
                  className="field"
                  value={fecha}
                  max={hoy}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="motivo">
                  Motivo
                </label>
                <input
                  id="motivo"
                  name="motivo"
                  type="text"
                  className="field"
                  placeholder="Ej. el chofer se olvidó de registrarla"
                  minLength={3}
                  required
                />
              </div>
              <p className="text-[11px] text-amber-700">
                La carga queda a nombre del chofer y con la fecha que pongas.
                En el Historial se ve que la registró administración.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="vehiculo_id">
            Vehículo
          </label>
          <select
            id="vehiculo_id"
            name="vehiculo_id"
            className="field"
            value={vehiculoId}
            onChange={(e) => setVehiculoId(e.target.value)}
            required
          >
            <option value="" disabled>
              Elegí un vehículo…
            </option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre} — {v.patente}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="tipo_combustible_id">
            Combustible
          </label>
          <select
            id="tipo_combustible_id"
            name="tipo_combustible_id"
            className="field"
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            disabled={!vehiculo}
            required
          >
            <option value="" disabled>
              {vehiculo ? "Elegí el combustible…" : "Elegí primero el vehículo"}
            </option>
            {combustibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {vehiculo && combustibles.length === 0 ? (
            <p className="mt-1 text-xs text-amber-600">
              Este vehículo no tiene combustibles configurados. Avisá al
              administrador.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="odometro_view">
              Kilometraje
            </label>
            <input type="hidden" name="odometro_km" value={odometro} />
            <input
              id="odometro_view"
              type="text"
              inputMode="numeric"
              className="field"
              placeholder="Ej. 154.320"
              value={fmtMiles(odometro)}
              onChange={(e) => setOdometro(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="litros">
              Litros
            </label>
            <input
              id="litros"
              name="litros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="field"
              placeholder="Ej. 45.5"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="total_view">
              Total cargado en Guaraníes (₲)
            </label>
            <input type="hidden" name="total" value={total} />
            <input
              id="total_view"
              type="text"
              inputMode="numeric"
              className="field"
              placeholder="Ej. 450.000"
              value={fmtMiles(total)}
              onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div>
            <label className="label">Precio/litro</label>
            <input
              type="text"
              className="field bg-slate-50 text-slate-600"
              value={
                precioLitro != null
                  ? precioLitro.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""
              }
              placeholder="Automático"
              readOnly
              tabIndex={-1}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Se calcula: Total ÷ Litros
            </p>
          </div>
        </div>

        <div>
          <label className="label">Estación</label>
          <input type="hidden" name="estacion_id" value={esOtra ? "" : estacionId} />
          {esOtra ? <input type="hidden" name="estacion_otra" value="1" /> : null}
          <Combobox
            options={opcionesEstaciones}
            value={estacionId}
            onChange={(id) => {
              setEstacionId(id);
              if (id) setFaltaEstacion(false);
            }}
            placeholder="Buscar estación…"
            allLabel="Elegí la estación…"
          />
          {faltaEstacion ? (
            <p className="mt-1 text-xs font-medium text-red-600">
              Elegí la estación. Si no está en la lista, elegí «Otra estación».
            </p>
          ) : null}
        </div>

        {esOtra ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-amber-50 p-3">
            <div>
              <label className="label" htmlFor="emblema_id">
                Emblema
              </label>
              <select id="emblema_id" name="emblema_id" className="field" defaultValue="" required>
                <option value="" disabled>
                  Elegí…
                </option>
                {emblemas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="estacion_nombre">
                Nombre o zona
              </label>
              <input
                id="estacion_nombre"
                name="estacion_nombre"
                type="text"
                className="field"
                placeholder="Ej. Ruta 2, Itauguá"
                minLength={2}
                required
              />
            </div>
          </div>
        ) : null}

        {olvidada ? null : (
        <div>
          <label className="label" htmlFor="registrado_ahora">
            Fecha y hora
          </label>
          <input
            id="registrado_ahora"
            type="datetime-local"
            className="field cursor-not-allowed bg-slate-100 text-slate-500"
            value={hoy}
            disabled
            readOnly
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Se registra automáticamente con la fecha y hora del momento.
          </p>
        </div>
        )}

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            name="tanque_lleno"
            className="h-5 w-5 accent-brand"
          />
          <span className="text-sm text-slate-600">
            Tanque lleno (mejora el cálculo de consumo)
          </span>
        </label>

        <div>
          <label className="label" htmlFor="notas">
            Notas <span className="text-slate-300">(opc.)</span>
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={2}
            className="field"
            placeholder="Observaciones…"
          />
        </div>
      </div>

      <Submit />
    </form>
  );
}
