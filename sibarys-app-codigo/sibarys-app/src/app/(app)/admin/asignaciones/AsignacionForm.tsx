"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearAsignacion, type AsigState } from "./actions";
import type { Vehiculo, Perfil } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Asignando…" : "Asignar vehículo"}
    </button>
  );
}

export default function AsignacionForm({
  vehiculos,
  choferes,
}: {
  vehiculos: Vehiculo[];
  choferes: Perfil[];
}) {
  const [state, action] = useFormState<AsigState, FormData>(
    crearAsignacion,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">
        Asignar vehículo a chofer
      </h2>
      <div>
        <label className="label">Vehículo</label>
        <select name="vehiculo_id" className="field" defaultValue="" required>
          <option value="" disabled>
            Elegí…
          </option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre} — {v.patente}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Chofer</label>
        <select name="chofer_id" className="field" defaultValue="" required>
          <option value="" disabled>
            Elegí…
          </option>
          {choferes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_completo || "(sin nombre)"}
            </option>
          ))}
        </select>
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
