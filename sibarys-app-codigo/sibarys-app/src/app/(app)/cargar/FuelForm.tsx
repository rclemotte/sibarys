"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearCarga, type CargarState } from "./actions";
import type { VehiculoParaCarga, EstacionParaCarga } from "@/lib/types";
import Combobox from "@/components/Combobox";

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
}: {
  vehiculos: VehiculoParaCarga[];
  estaciones: EstacionParaCarga[];
}) {
  const [state, formAction] = useFormState<CargarState, FormData>(crearCarga, {});
  const formRef = useRef<HTMLFormElement>(null);

  const [vehiculoId, setVehiculoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [precio, setPrecio] = useState("");
  const [estacionId, setEstacionId] = useState("");

  const vehiculo = useMemo(
    () => vehiculos.find((v) => v.id === vehiculoId),
    [vehiculos, vehiculoId]
  );
  const combustibles = vehiculo?.combustibles ?? [];

  // Opciones del buscador de estación (memorizadas para no reiniciar el texto)
  const opcionesEstaciones = useMemo(
    () =>
      estaciones.map((e) => ({
        id: e.id,
        nombre: `${e.nombre}${
          e.emblema_nombre ? ` — ${e.emblema_nombre}` : ""
        }${e.localidad ? ` (${e.localidad})` : ""}`,
      })),
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

  // Al elegir combustible: prefill del precio vigente
  useEffect(() => {
    const c = combustibles.find((x) => x.id === tipoId);
    if (c?.precio_vigente != null) setPrecio(String(c.precio_vigente));
  }, [tipoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setVehiculoId("");
      setTipoId("");
      setPrecio("");
      setEstacionId("");
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.success]);

  const hoy = new Date().toISOString().slice(0, 16);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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
                {c.precio_vigente != null ? ` — $${c.precio_vigente}/L` : ""}
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
            <label className="label" htmlFor="odometro_km">
              Kilometraje
            </label>
            <input
              id="odometro_km"
              name="odometro_km"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              className="field"
              placeholder="Ej. 154320"
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
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="precio_litro">
              Precio/litro
            </label>
            <input
              id="precio_litro"
              name="precio_litro"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="field"
              placeholder="Ej. 1150"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              Estación <span className="text-slate-300">(opc.)</span>
            </label>
            <input type="hidden" name="estacion_id" value={estacionId} />
            <Combobox
              options={opcionesEstaciones}
              value={estacionId}
              onChange={setEstacionId}
              placeholder="Buscar estación…"
              allLabel="Sin especificar"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="registrado_en">
            Fecha y hora
          </label>
          <input
            id="registrado_en"
            name="registrado_en"
            type="datetime-local"
            className="field"
            defaultValue={hoy}
          />
        </div>

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
