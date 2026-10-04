import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_TABS } from "@/lib/adminTabs";
import { esAdminRol, perfilActual, tienePermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";

/** Entrada a "Admin": lleva a la primera sección que el usuario puede usar. */
export default async function AdminIndex() {
  const yo = await perfilActual(createClient());
  if (!yo) redirect("/login");
  if (!esAdminRol(yo.rol)) redirect("/dashboard");
  const primera = ADMIN_TABS.find(
    (t) => !t.permiso || tienePermiso(yo, t.permiso)
  );
  redirect(primera?.href ?? "/admin/exportar");
}
