"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { asignarPassword, type AsignarPasswordState } from "./actions";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

/** Botón "Contraseña" que abre un mini formulario para asignarla. */
export default function AsignarPasswordForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<AsignarPasswordState, FormData>(
    asignarPassword,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-linea px-2.5 py-1.5 text-xs font-bold text-suave hover:bg-fondo"
      >
        Contraseña
      </button>
    );
  }

  return (
    <form ref={ref} action={action} className="mt-2 w-full space-y-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="password"
        type="text"
        className="field"
        placeholder="Nueva contraseña (mín. 6)"
        minLength={6}
        required
        autoFocus
      />
      {state.error ? (
        <p className="rounded-lg bg-error-suave px-3 py-2 text-xs text-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-ok-suave px-3 py-2 text-xs text-ok">
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
