"use client";

import { useFormState, useFormStatus } from "react-dom";
import { cambiarPassword, type CambiarState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar y continuar"}
    </button>
  );
}

export default function CambiarPasswordForm() {
  const [state, formAction] = useFormState<CambiarState, FormData>(
    cambiarPassword,
    {}
  );

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="password">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmar">
          Repetir contraseña
        </label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          className="field"
          placeholder="Repetí la contraseña"
          minLength={6}
          required
        />
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
