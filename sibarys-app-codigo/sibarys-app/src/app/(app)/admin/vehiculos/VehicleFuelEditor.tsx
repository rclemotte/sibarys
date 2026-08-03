"use client";

import { useState } from "react";
import { guardarCombustibles } from "./actions";
import type { TipoCombustible } from "@/lib/types";

export default function VehicleFuelEditor({
  vehiculoId,
  tipos,
  seleccionados,
}: {
  vehiculoId: string;
  tipos: TipoCombustible[];
  seleccionados: string[];
}) {
  const [open, setOpen] = useState(false);
  const nombres = tipos
    .filter((t) => seleccionados.includes(t.id))
    .map((t) => t.nombre);

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {nombres.length > 0 ? (
            nombres.map((n) => (
              <span
                key={n}
                className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand"
              >
                {n}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-amber-600">
              Sin combustibles
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 text-xs font-medium text-brand"
        >
          {open ? "Cerrar" : "Editar"}
        </button>
      </div>

      {open ? (
        <form action={guardarCombustibles} className="mt-2 space-y-2">
          <input type="hidden" name="vehiculo_id" value={vehiculoId} />
          <div className="grid grid-cols-2 gap-2">
            {tipos.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  name="combustibles"
                  value={t.id}
                  defaultChecked={seleccionados.includes(t.id)}
                  className="h-4 w-4 accent-brand"
                />
                {t.nombre}
              </label>
            ))}
          </div>
          <button
            type="submit"
            onClick={() => setTimeout(() => setOpen(false), 100)}
            className="btn-primary w-full py-2 text-sm"
          >
            Guardar combustibles
          </button>
        </form>
      ) : null}
    </div>
  );
}
