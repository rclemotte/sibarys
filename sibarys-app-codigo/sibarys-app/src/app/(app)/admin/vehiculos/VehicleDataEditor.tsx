"use client";

import { useState } from "react";
import { guardarDatosVehiculo } from "./actions";
import type { Empresa, Vehiculo } from "@/lib/types";

export default function VehicleDataEditor({
  vehiculo,
  empresas,
}: {
  vehiculo: Vehiculo;
  empresas: Empresa[];
}) {
  const [open, setOpen] = useState(false);
  const [alquilado, setAlquilado] = useState(vehiculo.es_alquilado);

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-brand"
      >
        {open ? "Cerrar datos" : "Editar datos (tanque, consumo, alquiler)"}
      </button>

      {open ? (
        <form action={guardarDatosVehiculo} className="mt-2 space-y-3">
          <input type="hidden" name="vehiculo_id" value={vehiculo.id} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Capacidad tanque (L)</label>
              <input
                name="capacidad_tanque_litros"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="field"
                defaultValue={vehiculo.capacidad_tanque_litros ?? ""}
                placeholder="Ej. 55"
              />
            </div>
            <div>
              <label className="label">Consumo prom. (km/l)</label>
              <input
                name="consumo_promedio_asignado"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="field"
                defaultValue={vehiculo.consumo_promedio_asignado ?? ""}
                placeholder="Ej. 12.5"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="es_alquilado"
                checked={alquilado}
                onChange={(e) => setAlquilado(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-sm text-slate-600">Vehículo alquilado</span>
            </label>
            {alquilado ? (
              <div className="mt-2">
                <label className="label">Empresa que lo alquila</label>
                <select
                  name="empresa_id"
                  className="field"
                  defaultValue={vehiculo.empresa_id ?? ""}
                >
                  <option value="">Elegí…</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            onClick={() => setTimeout(() => setOpen(false), 100)}
            className="btn-primary w-full py-2 text-sm"
          >
            Guardar datos
          </button>
        </form>
      ) : null}
    </div>
  );
}
