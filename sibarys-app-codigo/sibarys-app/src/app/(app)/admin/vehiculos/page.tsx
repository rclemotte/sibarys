import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Vehiculo, TipoCombustible, Marca } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import VehicleForm from "./VehicleForm";
import VehicleFuelEditor from "./VehicleFuelEditor";
import { toggleVehiculo } from "./actions";

export const dynamic = "force-dynamic";

export default async function VehiculosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return (
      <div className="card text-center text-sm text-slate-500">
        Esta sección es solo para administradores.
      </div>
    );
  }

  const [{ data: vs }, { data: ts }, { data: vc }, { data: ms }] =
    await Promise.all([
      supabase
        .from("vehiculos")
        .select("*")
        .order("activo", { ascending: false })
        .order("nombre"),
      supabase
        .from("tipos_combustible")
        .select("*")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("vehiculo_combustibles")
        .select("vehiculo_id, tipo_combustible_id"),
      supabase.from("marcas").select("*").eq("activo", true).order("nombre"),
    ]);

  const vehiculos = (vs || []) as Vehiculo[];
  const tipos = (ts || []) as TipoCombustible[];
  const marcas = (ms || []) as Marca[];

  const combPorVehiculo = new Map<string, string[]>();
  (vc || []).forEach((row: any) => {
    const arr = combPorVehiculo.get(row.vehiculo_id) || [];
    arr.push(row.tipo_combustible_id);
    combPorVehiculo.set(row.vehiculo_id, arr);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <VehicleForm tipos={tipos} marcas={marcas} />

      <ul className="space-y-2">
        {vehiculos.map((v) => (
          <li key={v.id} className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {v.nombre}{" "}
                  {!v.activo ? (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      inactivo
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-400">
                  {v.patente} · {v.marca || "—"} {v.modelo || ""}{" "}
                  {v.anio ? `· ${v.anio}` : ""}
                </p>
              </div>
              <form action={toggleVehiculo}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="activo" value={String(v.activo)} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {v.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </div>

            <VehicleFuelEditor
              vehiculoId={v.id}
              tipos={tipos}
              seleccionados={combPorVehiculo.get(v.id) || []}
            />
          </li>
        ))}
        {vehiculos.length === 0 ? (
          <li className="card text-center text-sm text-slate-400">
            Todavía no hay vehículos.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
