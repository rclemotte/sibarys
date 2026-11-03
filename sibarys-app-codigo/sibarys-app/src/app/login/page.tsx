"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";
import PantallaAcceso from "@/components/ui/PantallaAcceso";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full text-lg" disabled={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, { error: "" } as {
    error: string;
  });

  return (
    <PantallaAcceso titulo="¡Hola de nuevo!" subtitulo="Control de combustible de la flota">
        <form action={formAction} className="space-y-5">
          <div>
            <label className="label" htmlFor="cedula">
              Cédula
            </label>
            <input
              id="cedula"
              name="cedula"
              type="text"
              autoComplete="username"
              inputMode="numeric"
              className="field"
              placeholder="Ej. 12345678"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="field"
              placeholder="••••••••"
              required
            />
          </div>

          {state?.error ? (
            <p role="alert" className="rounded-2xl bg-error-suave px-4 py-3 text-sm font-bold text-error">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm font-semibold text-tenue">
          ¿No tenés cuenta? Pedí acceso al administrador.
        </p>
    </PantallaAcceso>
  );
}
