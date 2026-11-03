"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { cambiarAnulacion, type EditarState } from "./actions";

function Confirmar({ anular }: { anular: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn flex-1 ${anular ? "bg-error text-white" : "bg-marca text-tinta shadow-boton"}`}
    >
      {pending ? "Guardando…" : anular ? "Anular carga" : "Restaurar carga"}
    </button>
  );
}

/** Botón "Anular" (o "Restaurar") con motivo obligatorio. */
export default function AnularCargaForm({
  id,
  anular,
}: {
  id: string;
  anular: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<EditarState, FormData>(
    cambiarAnulacion,
    {},
  );

  if (state.success)
    return (
      <p className="mt-2 rounded-lg bg-ok-suave px-3 py-2 text-xs text-ok">
        {state.success}
      </p>
    );

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-chico mt-2 border-2 bg-white ${
          anular ? "border-error/30 text-error hover:bg-error-suave" : "border-linea text-tinta hover:bg-fondo"
        }`}
      >
        {anular ? "Anular carga" : "Restaurar"}
      </button>
    );

  return (
    <form
      action={action}
      className={`mt-2 space-y-2 rounded-xl border p-3 ${
        anular ? "border-error/30 bg-error-suave" : "border-linea"
      }`}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value={anular ? "anular" : "restaurar"} />
      <p className="text-xs text-suave">
        {anular
          ? "La carga deja de contar en consumo, reportes y exportaciones. No se borra: queda en el Historial y se puede restaurar."
          : "La carga vuelve a contar en consumo, reportes y exportaciones."}
      </p>
      <input
        name="motivo"
        type="text"
        className="field"
        placeholder={anular ? "Motivo (ej. carga duplicada)" : "Motivo"}
        minLength={3}
        required
      />
      {state.error ? (
        <p className="rounded-lg bg-error-suave px-3 py-2 text-xs text-error">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <Confirmar anular={anular} />
      </div>
    </form>
  );
}
