import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import type { Perfil } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single<Perfil>();

  // Primer ingreso: obligar a cambiar la contraseña antes de usar la app
  if (perfil?.debe_cambiar_password) redirect("/cambiar-password");

  const isAdmin = perfil?.rol === "admin";
  const name = perfil?.nombre_completo || perfil?.cedula || user.email;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
            S
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-[11px] text-slate-400">
              {isAdmin ? "Administrador" : "Chofer"}
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
