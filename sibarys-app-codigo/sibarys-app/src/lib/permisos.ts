// Roles y permisos de la app.
//
// - superadmin: puede todo y decide qué puede editar cada admin.
// - admin: gestiona la flota, pero solo edita lo que el superadmin le habilitó.
// - chofer: registra sus cargas.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Rol = "chofer" | "admin" | "superadmin";

export type Permiso =
  | "puede_editar_vehiculos"
  | "puede_corregir_km"
  | "puede_gestionar_usuarios"
  | "puede_editar_catalogos";

/** Lista de permisos editables, con su texto para la pantalla. */
export const PERMISOS: { campo: Permiso; label: string }[] = [
  {
    campo: "puede_editar_vehiculos",
    label: "Editar vehículos (alta, patente, tanque, consumo, combustibles)",
  },
  { campo: "puede_corregir_km", label: "Corregir kilometraje de cargas" },
  {
    campo: "puede_gestionar_usuarios",
    label: "Crear y dar de baja choferes, cambiarles la contraseña",
  },
  {
    campo: "puede_editar_catalogos",
    label: "Editar catálogos (combustibles, marcas, empresas, emblemas, estaciones)",
  },
];

export type PerfilConPermisos = {
  id: string;
  rol: Rol | string | null;
} & Partial<Record<Permiso, boolean | null>>;

/** ¿El rol es de administración (admin o superadmin)? */
export function esAdminRol(rol: string | null | undefined): boolean {
  return rol === "admin" || rol === "superadmin";
}

export function esSuperadmin(rol: string | null | undefined): boolean {
  return rol === "superadmin";
}

/**
 * ¿Este perfil tiene el permiso?
 * El superadmin siempre. El admin, salvo que se lo hayan quitado
 * (si la columna todavía no existe en la base, se toma como habilitado).
 */
export function tienePermiso(
  perfil: PerfilConPermisos | null | undefined,
  permiso: Permiso
): boolean {
  if (!perfil) return false;
  if (perfil.rol === "superadmin") return true;
  if (perfil.rol !== "admin") return false;
  return perfil[permiso] !== false;
}

/** Perfil del usuario logueado (con rol y permisos). */
export async function perfilActual(
  supabase: SupabaseClient
): Promise<PerfilConPermisos | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as PerfilConPermisos) ?? null;
}

export function textoRol(rol: string | null | undefined): string {
  if (rol === "superadmin") return "Súper admin";
  if (rol === "admin") return "Administrador";
  return "Chofer";
}
