"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearVehiculo, type VehState } from "./actions";
import type { TipoCombustible, Marca } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Agregar vehículo"}
    </button>
  );
}

export default function VehicleForm({
  tipos,
  marcas,
}: {
  tipos: TipoCombustible[];
  marcas: Marca[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<VehState, FormData>(
    crearVehiculo,
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
        + Agregar vehículo
      </button>
    );
  }

  return (
    <form ref={ref} action={formAction} className="card space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Patente</label>
          <input name="patente" className="field" placeholder="AB123CD" required />
        </div>
        <div>
          <label className="label">Alias</label>
          <input name="nombre" className="field" placeholder="Onix Joy 1" required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Marca</label>
          <select name="marca" className="field" defaultValue="">
            <option value="">Elegí…</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Modelo</label>
          <input name="modelo" className="field" placeholder="Onix Joy" />
        </div>
        <div>
          <label className="label">Año</label>
          <input name="anio" type="number" className="field" placeholder="2022" />
        </div>
      </div>
      {marcas.length === 0 ? (
        <p className="-mt-1 text-xs text-amber-600">
          No hay marcas cargadas. Agregalas en la pestaña Marcas.
        </p>
      ) : null}

      <div>
        <label className="label">Combustibles que puede usar</label>
        {tipos.length === 0 ? (
          <p className="text-xs text-amber-600">
            Primero cargá tipos de combustible en la pestaña Tarifas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tipos.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="combustibles"
                  value={t.id}
                  className="h-4 w-4 accent-brand"
                />
                {t.nombre}
              </label>
            ))}
          </div>
        )}
      </div>

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
