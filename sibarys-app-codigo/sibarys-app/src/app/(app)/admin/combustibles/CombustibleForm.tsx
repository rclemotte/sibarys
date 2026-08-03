"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearCombustible, type CombustibleState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Agregar combustible"}
    </button>
  );
}

export default function CombustibleForm() {
  const [state, action] = useFormState<CombustibleState, FormData>(
    crearCombustible,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">
        Nuevo combustible
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Nombre</label>
          <input
            name="nombre"
            className="field"
            placeholder="Nafta Súper 97"
            required
          />
        </div>
        <div>
          <label className="label">Octanaje</label>
          <input
            name="octanaje"
            type="number"
            className="field"
            placeholder="97"
          />
        </div>
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

      <Submit />
    </form>
  );
}
