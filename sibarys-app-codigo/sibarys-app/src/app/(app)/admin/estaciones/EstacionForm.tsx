"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearEstacion, type EstacionState } from "./actions";
import type { Emblema } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Agregar estación"}
    </button>
  );
}

export default function EstacionForm({ emblemas }: { emblemas: Emblema[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<EstacionState, FormData>(
    crearEstacion,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <button className="btn-primary w-full" onClick={() => setOpen(true)}>
        + Agregar estación
      </button>
    );
  }

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <div>
        <label className="label">Nombre de la estación</label>
        <input
          name="nombre"
          className="field"
          placeholder="Ej. Curva Romero"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Localidad</label>
          <input name="localidad" className="field" placeholder="Ej. Luque" />
        </div>
        <div>
          <label className="label">Emblema</label>
          <select name="emblema_id" className="field" defaultValue="">
            <option value="">Elegí…</option>
            {emblemas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      {emblemas.length === 0 ? (
        <p className="-mt-1 text-xs text-amber-600">
          No hay emblemas cargados. Agregalos en la pestaña Emblemas.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost flex-1"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
        <div className="flex-1">
          <Submit />
        </div>
      </div>
    </form>
  );
}
