import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Vehiculo, Perfil, Asignacion } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import AsignacionForm from "./AsignacionForm";
import { quitarAsignacion } from "./actions";

export const dynamic = "force-dynamic";

export default async function AsignacionesPage() {
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

  const [{ data: vs }, { data: ps }, { data: asg }] = await Promise.all([
    supabase.from("vehiculos").select("*").eq("activo", true).order("nombre"),
    supabase
      .from("perfiles")
      .select("*")
      .eq("activo", true)
      .order("nombre_completo"),
    supabase.from("asignaciones").select("*").eq("activo", true),
  ]);

  const vehiculos = (vs || []) as Vehiculo[];
  const choferes = (ps || []) as Perfil[];
  const asignaciones = (asg || []) as Asignacion[];

  const vehById = new Map(vehiculos.map((v) => [v.id, v]));
  const perById = new Map(choferes.map((p) => [p.id, p]));

  // Agrupar por chofer
  const porChofer = new Map<string, Asignacion[]>();
  for (const a of asignaciones) {
    const arr = porChofer.get(a.chofer_id) || [];
    arr.push(a);
    porChofer.set(a.chofer_id, arr);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <AsignacionForm vehiculos={vehiculos} choferes={choferes} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Asignaciones activas
        </h2>
        {asignaciones.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            No hay asignaciones. Asigná un vehículo arriba.
          </div>
        ) : (
          <ul className="space-y-3">
            {Array.from(porChofer.entries()).map(([choferId, lista]) => {
              const chofer = perById.get(choferId);
              return (
                <li key={choferId} className="card">
                  <p className="mb-2 font-semibold">
                    {chofer?.nombre_completo || "(sin nombre)"}
                  </p>
                  <ul className="space-y-1.5">
                    {lista.map((a) => {
                      const v = vehById.get(a.vehiculo_id);
                      return (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm">
                            {v ? `${v.nombre} — ${v.patente}` : "Vehículo"}
                          </span>
                          <form action={quitarAsignacion}>
                            <input type="hidden" name="id" value={a.id} />
                            <button className="text-xs font-medium text-red-600 hover:underline">
                              Quitar
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
