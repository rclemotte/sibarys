import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, KeyRound, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_TABS } from "@/lib/adminTabs";
import { esAdminRol, perfilActual, textoRol, tienePermiso } from "@/lib/permisos";
import { INFO_ADMIN } from "@/lib/navInfo";
import Encabezado from "@/components/ui/Encabezado";
import LogoutButton from "@/components/LogoutButton";
import { iniciales } from "@/lib/format";

export const dynamic = "force-dynamic";

/** "Más" (celular): usuario, secciones de administración y cuenta. */
export default async function MasPage() {
  const supabase = createClient();
  const yo = await perfilActual(supabase);
  if (!yo) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nombre = (yo as any).nombre_completo || (yo as any).cedula || user?.email || "";
  const tabs = esAdminRol(yo.rol) ? ADMIN_TABS.filter((t) => !t.permiso || tienePermiso(yo, t.permiso)) : [];

  return (
    <div className="space-y-5">
      <Encabezado titulo="Más" subtitulo="Tu cuenta y la administración" />

      <div className="card flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-marca font-display text-xl font-extrabold text-tinta">
          {iniciales(nombre)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-extrabold">{nombre}</p>
          <p className="text-sm font-semibold text-suave">{textoRol(yo.rol)}</p>
        </div>
      </div>

      {tabs.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 font-display text-lg font-extrabold">
            <Settings size={18} strokeWidth={2.6} className="text-brand" /> Administración
          </h2>
          <ul className="card divide-y divide-linea p-0">
            {tabs.map((t) => {
              const info = INFO_ADMIN[t.href];
              const Icono = info?.icono ?? Settings;
              return (
                <li key={t.href}>
                  <Link href={t.href} className="flex items-center gap-3 px-4 py-3.5 transition active:bg-fondo">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-suave text-brand">
                      <Icono size={20} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{t.label}</span>
                      {info ? <span className="block text-xs font-semibold text-suave">{info.texto}</span> : null}
                    </span>
                    <ChevronRight size={20} strokeWidth={2.4} className="text-tenue" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="space-y-3">
        {esAdminRol(yo.rol) ? (
          <Link href="/cambiar-password" className="btn-ghost w-full">
            <KeyRound size={20} strokeWidth={2.4} /> Cambiar contraseña
          </Link>
        ) : null}
        <LogoutButton variante="fila" />
      </div>
    </div>
  );
}
