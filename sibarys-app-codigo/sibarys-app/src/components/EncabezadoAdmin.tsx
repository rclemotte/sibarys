import Encabezado from "@/components/ui/Encabezado";
import AdminNav from "@/components/AdminNav";
import { ADMIN_TABS } from "@/lib/adminTabs";
import { INFO_ADMIN } from "@/lib/navInfo";

/** Encabezado de una sección de Administración + chips de secciones (celular). */
export default function EncabezadoAdmin({ seccion }: { seccion: string }) {
  const tab = ADMIN_TABS.find((t) => t.href === seccion);
  const titulo = tab?.label ?? (seccion === "/admin/asignaciones" ? "Asignaciones" : "Administración");
  const sub = INFO_ADMIN[seccion]?.texto ?? "Administración";
  return (
    <>
      <Encabezado titulo={titulo} subtitulo={sub} />
      <AdminNav />
    </>
  );
}
