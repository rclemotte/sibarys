import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Vehiculo } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import ExportPanel from "./ExportPanel";

export const dynamic = "force-dynamic";

export default async function ExportarPage() {
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

  if (yo?.rol !== "admin") {
    return (
      <div className="card text-center text-sm text-slate-500">
        Esta sección es solo para administradores.
      </div>
    );
  }

  const [{ data: ps }, { data: vs }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo")
      .order("nombre_completo"),
    supabase.from("vehiculos").select("id, nombre, patente").order("nombre"),
  ]);

  const choferes = ((ps || []) as Pick<Perfil, "id" | "nombre_completo">[]).map(
    (p) => ({ id: p.id, nombre: p.nombre_completo || "(sin nombre)" })
  );
  const vehiculos = (
    (vs || []) as Pick<Vehiculo, "id" | "nombre" | "patente">[]
  ).map((v) => ({ id: v.id, nombre: `${v.nombre} — ${v.patente}` }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <div>
        <h2 className="text-base font-semibold text-slate-700">
          Exportar cargas a Excel
        </h2>
        <p className="text-sm text-slate-500">
          Descargá un archivo .xlsx con las cargas y su consumo.
        </p>
      </div>

      <ExportPanel choferes={choferes} vehiculos={vehiculos} />
    </div>
  );
}
