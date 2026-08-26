import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CambiarPasswordForm from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

export default async function CambiarPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-white">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cambiá tu contraseña
          </h1>
          <p className="text-slate-500">
            Es tu primer ingreso. Elegí una contraseña nueva para continuar.
          </p>
        </div>

        <CambiarPasswordForm />
      </div>
    </main>
  );
}
