"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { corregirOdometro, type CorregirState } from "./actions";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

/** Botón "Corregir km" (solo admin) que abre el formulario de corrección. */
export default function CorregirOdometroForm({
  id,
  odometroActual,
}: {
  id: string;
  odometroActual: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<CorregirState, FormData>(
    corregirOdometro,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Corregir km
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-2 space-y-2 border-t border-slate-100 pt-2"
    >
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label">Kilometraje correcto</label>
        <input
          name="odometro_km"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          className="field"
          defaultValue={odometroActual}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label">Motivo / observación</label>
        <input
          name="motivo"
          type="text"
          className="field"
          placeholder="Ej. el chofer agregó un cero de más"
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
