"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearMarca, type MarcaState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "…" : "Agregar"}
    </button>
  );
}

export default function MarcaForm() {
  const [state, action] = useFormState<MarcaState, FormData>(crearMarca, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={action} className="card space-y-2">
      <h2 className="text-sm font-semibold text-suave">Nueva marca</h2>
      <div className="flex gap-2">
        <input
          name="nombre"
          className="field flex-1"
          placeholder="Ej. RAM"
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
