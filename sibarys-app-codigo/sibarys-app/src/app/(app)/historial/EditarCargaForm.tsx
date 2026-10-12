"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Combobox from "@/components/Combobox";
import { editarCarga, type EditarState } from "./actions";

type Opt = { id: string; nombre: string };

export type CargaEditable = {
  id: string;
  vehiculo_id: string;
  tipo_combustible_id: string | null;
  estacion_id: string | null;
  odometro_km: number;
  litros: number;
  costo_total: number | null;
  tanque_lleno: boolean;
  notas: string | null;
};

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

/** Botón "Editar carga" (administración) que abre el formulario completo. */
export default function EditarCargaForm({
  carga,
  vehiculos,
  combustibles,
  estaciones,
}: {
  carga: CargaEditable;
  vehiculos: Opt[];
  combustibles: Opt[];
  estaciones: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [estacionId, setEstacionId] = useState(carga.estacion_id ?? "");
  const [litros, setLitros] = useState(String(carga.litros ?? ""));
  const [total, setTotal] = useState(
    carga.costo_total != null ? String(carga.costo_total) : "",
  );
  const [state, action] = useFormState<EditarState, FormData>(editarCarga, {});

  const precioLitro = useMemo(() => {
    const l = Number(litros.replace(",", "."));
    const t = Number(total.replace(",", "."));
    return l > 0 && t > 0 ? Math.round(t / l) : null;
  }, [litros, total]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Editar carga
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-2 space-y-3 border-t border-slate-100 pt-3"
    >
      <input type="hidden" name="id" value={carga.id} />
      <input type="hidden" name="estacion_id" value={estacionId} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Vehículo</label>
          <select
            name="vehiculo_id"
            className="field"
            defaultValue={carga.vehiculo_id}
            required
          >
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Combustible</label>
          <select
            name="tipo_combustible_id"
            className="field"
            defaultValue={carga.tipo_combustible_id ?? ""}
            required
          >
            <option value="">Elegí…</option>
            {combustibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Kilometraje</label>
          <input
            name="odometro_km"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            className="field"
            defaultValue={carga.odometro_km}
            required
          />
        </div>
        <div>
          <label className="label">Litros</label>
          <input
            name="litros"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="field"
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Total cargado (₲)</label>
        <input
          name="total"
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          className="field"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          required
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Precio por litro:{" "}
          {precioLitro != null
            ? `₲ ${precioLitro.toLocaleString("es-AR")}`
            : "—"}
        </p>
      </div>

      <div>
        <label className="label">Estación</label>
        <Combobox
          options={estaciones}
          value={estacionId}
          onChange={setEstacionId}
          placeholder="Buscar estación…"
          allLabel="Sin especificar"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="tanque_lleno"
          defaultChecked={carga.tanque_lleno}
          className="h-4 w-4 accent-brand"
        />
        Tanque lleno
      </label>

      <div>
        <label className="label">Notas</label>
        <input
          name="notas"
          type="text"
          className="field"
          defaultValue={carga.notas ?? ""}
        />
      </div>

      <div>
        <label className="label">Motivo de la corrección *</label>
        <input
          name="motivo"
          type="text"
          className="field"
          placeholder="Ej. el chofer cargó mal el total"
          minLength={3}
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost flex-1"
          onClick={() => setOpen(false)}
        >
          Cerrar
        </button>
        <Guardar />
      </div>
    </form>
  );
}
