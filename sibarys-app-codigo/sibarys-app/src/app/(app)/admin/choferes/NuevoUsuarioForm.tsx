"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearUsuario, type NuevoUsuarioState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Creando…" : "Crear usuario"}
    </button>
  );
}

export default function NuevoUsuarioForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<NuevoUsuarioState, FormData>(
    crearUsuario,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  if (!open) {
    return (
      <button className="btn-primary w-full" onClick={() => setOpen(true)}>
        + Crear usuario
      </button>
    );
  }

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">Nuevo usuario</h2>

      <div>
        <label className="label">Nombre y apellido</label>
        <input
          name="nombre_completo"
          className="field"
          placeholder="Juan Pérez"
          required
        />
      </div>

      <div>
        <label className="label">Cédula</label>
        <input
          name="cedula"
          type="text"
          inputMode="numeric"
          className="field"
          placeholder="Ej. 12345678"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contraseña inicial</label>
          <input
            name="password"
            type="text"
            className="field"
            placeholder="mín. 6 caracteres"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="label">Rol</label>
          <select name="rol" className="field" defaultValue="chofer">
            <option value="chofer">Chofer</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        El usuario entra con su cédula y esta contraseña. En su primer ingreso
        deberá elegir una nueva.
      </p>

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

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost flex-1"
          onClick={() => setOpen(false)}
        >
          Cerrar
        </button>
        <div className="flex-1">
          <Submit />
        </div>
      </div>
    </form>
  );
}
