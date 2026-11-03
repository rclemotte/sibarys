"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearEmpresa, type EmpresaState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "…" : "Agregar"}
    </button>
  );
}

export default function EmpresaForm() {
  const [state, action] = useFormState<EmpresaState, FormData>(
    crearEmpresa,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={action} className="card space-y-2">
      <h2 className="text-sm font-semibold text-suave">Nueva empresa</h2>
      <p className="text-xs text-tenue">
        Empresas de las que se alquilan vehículos (rentadoras / agencias).
      </p>
      <div className="flex gap-2">
        <input
          name="nombre"
          className="field flex-1"
          placeholder="Ej. Renting S.A."
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
