"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { agregarPrecio, type TarifaState } from "./actions";
import type { TipoCombustible } from "@/lib/types";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar precio"}
    </button>
  );
}

function Msg({ state }: { state: TarifaState }) {
  if (state.error)
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  return null;
}

export default function TarifaForms({ tipos }: { tipos: TipoCombustible[] }) {
  const [state, action] = useFormState<TarifaState, FormData>(
    agregarPrecio,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">Actualizar precio</h2>

      <div>
        <label className="label">Combustible</label>
        <select
          name="tipo_combustible_id"
          className="field"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Elegí…
          </option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        {tipos.length === 0 ? (
          <p className="mt-1 text-xs text-amber-600">
            No hay combustibles. Agregá uno en la pestaña Combustibles.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Precio por litro</label>
          <input
            name="precio"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className="field"
            placeholder="1150"
            required
          />
        </div>
        <div>
          <label className="label">Vigente desde</label>
          <input
            name="vigente_desde"
            type="date"
            className="field"
            defaultValue={hoy}
          />
        </div>
      </div>

      <Msg state={state} />
      <SubmitBtn />
    </form>
  );
}
