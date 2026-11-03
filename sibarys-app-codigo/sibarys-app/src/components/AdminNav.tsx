"use client";

import { useEffect, useState } from "react";
import ChipsNav from "@/components/ui/ChipsNav";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_TABS } from "@/lib/adminTabs";
import { tienePermiso, type PerfilConPermisos } from "@/lib/permisos";

export default function AdminNav() {
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

  return <ChipsNav tabs={tabs} />;
}
