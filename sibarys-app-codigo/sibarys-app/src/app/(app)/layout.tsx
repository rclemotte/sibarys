import { redirect } from "next/navigation";
import { esAdminRol, textoRol, tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_TABS } from "@/lib/adminTabs";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import type { Perfil } from "@/lib/types";
import { iniciales } from "@/lib/format";

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

  // Primer ingreso: obligar a cambiar la contraseña antes de usar la app.
  // Solo para administradores: a los choferes la contraseña se la pone el
  // admin y no se les pide cambiarla.
  if (esAdminRol(perfil?.rol) && perfil?.debe_cambiar_password)
    redirect("/cambiar-password");

  const isAdmin = esAdminRol(perfil?.rol);
  const name = perfil?.nombre_completo || perfil?.cedula || user.email || "";
  const adminTabs = isAdmin
    ? ADMIN_TABS.filter((t) => !t.permiso || tienePermiso(perfil as any, t.permiso)).map(({ href, label }) => ({
        href,
        label,
      }))
    : [];

  return (
    <div className="min-h-screen">
      <Sidebar
        esAdmin={isAdmin}
        adminTabs={adminTabs}
        nombre={name}
        rol={textoRol(perfil?.rol)}
        iniciales={iniciales(name)}
        salir={<LogoutButton />}
      />
      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-app px-4 pb-36 pt-4 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
