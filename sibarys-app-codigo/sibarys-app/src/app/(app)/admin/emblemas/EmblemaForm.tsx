"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearEmblema, type EmblemaState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "…" : "Agregar"}
    </button>
  );
}

export default function EmblemaForm() {
  const [state, action] = useFormState<EmblemaState, FormData>(
    crearEmblema,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={action} className="card space-y-2">
      <h2 className="text-sm font-semibold text-suave">Nuevo emblema</h2>
      <p className="text-xs text-tenue">
        Marca de la estación de nafta (Shell, YPF, Axion…).
      </p>
      <div className="flex gap-2">
        <input
          name="nombre"
          className="field flex-1"
          placeholder="Ej. Shell"
          required
        />
        <Submit />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-error-suave px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-ok-suave px-3 py-2 text-sm text-ok">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
