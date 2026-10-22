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
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
        anular ? "bg-red-600" : "bg-brand"
      }`}
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
      <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        {state.success}
      </p>
    );

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-2 ml-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
          anular
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        {anular ? "Anular carga" : "Restaurar"}
      </button>
    );

  return (
    <form
      action={action}
      className={`mt-2 space-y-2 rounded-xl border p-3 ${
        anular ? "border-red-200 bg-red-50/50" : "border-slate-200"
      }`}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value={anular ? "anular" : "restaurar"} />
      <p className="text-xs text-slate-600">
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
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
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
