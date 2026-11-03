"use client";

import { hoyLocal } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { agregarPrecio, borrarPrecio, type TarifaState } from "./actions";

type Opt = { id: string; nombre: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar precio"}
    </button>
  );
}

const miles = (raw: string) => (raw ? Number(raw).toLocaleString("es-AR") : "");

/** Formulario para cargar el precio de referencia de un emblema y combustible. */
export default function TarifaForms({
  emblemas,
  tipos,
}: {
  emblemas: Opt[];
  tipos: Opt[];
}) {
  const [state, action] = useFormState<TarifaState, FormData>(agregarPrecio, {});
  const ref = useRef<HTMLFormElement>(null);
  const [precio, setPrecio] = useState("");

  useEffect(() => {
    if (state.success) {
      ref.current?.reset();
      setPrecio("");
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold text-suave">Cargar precio de referencia</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Emblema</label>
          <select name="emblema_id" className="field" defaultValue="" required>
            <option value="" disabled>
              Elegí…
            </option>
            {emblemas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Combustible</label>
          <select name="tipo_combustible_id" className="field" defaultValue="" required>
            <option value="" disabled>
              Elegí…
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Precio por litro (Gs.)</label>
          <input type="hidden" name="precio" value={precio} />
          <input
            type="text"
            inputMode="numeric"
            className="field"
            placeholder="Ej. 7.690"
            value={miles(precio)}
            onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <div>
          <label className="label">Vigente desde</label>
          <input name="vigente_desde" type="date" className="field" defaultValue={hoyLocal()} required />
        </div>
      </div>
      {state.error ? (
        <p className="rounded-lg bg-error-suave px-3 py-2 text-sm text-error">{state.error}</p>
      ) : state.success ? (
        <p className="rounded-lg bg-ok-suave px-3 py-2 text-sm text-ok">{state.success}</p>
      ) : null}
      <SubmitBtn />
    </form>
  );
}

/** Botón chico para borrar un precio cargado por error. */
export function BorrarPrecio({ id }: { id: string }) {
  const [pend, setPend] = useState(false);
  return (
    <button
      type="button"
      disabled={pend}
      onClick={async () => {
        if (!window.confirm("¿Borrar este precio?")) return;
        setPend(true);
        await borrarPrecio(id);
        setPend(false);
      }}
      className="ml-2 text-error hover:underline"
    >
      {pend ? "…" : "borrar"}
    </button>
  );
}
