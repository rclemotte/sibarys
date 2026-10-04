import type { Permiso } from "@/lib/permisos";

/** Secciones de administración y el permiso que necesita cada una. */
export const ADMIN_TABS: { href: string; label: string; permiso?: Permiso }[] = [
  { href: "/admin/vehiculos", label: "Vehículos", permiso: "puede_editar_vehiculos" },
  { href: "/admin/combustibles", label: "Combustibles", permiso: "puede_editar_catalogos" },
  { href: "/admin/marcas", label: "Marcas", permiso: "puede_editar_catalogos" },
  { href: "/admin/empresas", label: "Empresas", permiso: "puede_editar_catalogos" },
  { href: "/admin/emblemas", label: "Emblemas", permiso: "puede_editar_catalogos" },
  { href: "/admin/estaciones", label: "Estaciones", permiso: "puede_editar_catalogos" },
  { href: "/admin/choferes", label: "Choferes", permiso: "puede_gestionar_usuarios" },
  { href: "/admin/exportar", label: "Exportar" },
];
