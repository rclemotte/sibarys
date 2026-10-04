"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_TABS } from "@/lib/adminTabs";
import { tienePermiso, type PerfilConPermisos } from "@/lib/permisos";

export default function AdminNav() {
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilConPermisos | null>(null);

  // Trae el perfil para mostrar solo las secciones que el usuario puede usar
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setPerfil((data as PerfilConPermisos) ?? null));
    });
  }, []);

  const tabs = perfil
    ? ADMIN_TABS.filter((t) => !t.permiso || tienePermiso(perfil, t.permiso))
    : ADMIN_TABS;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-brand text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
