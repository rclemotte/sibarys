import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdminRol } from "@/lib/permisos";

/**
 * Para páginas solo de administración: devuelve el cliente de Supabase o
 * manda al usuario a Reportes (un chofer solo ve su análisis).
 */
export async function soloAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: yo } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!esAdminRol(yo?.rol)) redirect("/reportes");
  return supabase;
}
