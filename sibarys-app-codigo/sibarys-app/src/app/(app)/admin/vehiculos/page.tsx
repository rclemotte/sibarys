import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Vehiculo, TipoCombustible, Marca, Empresa } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import VehicleForm from "./VehicleForm";
import VehicleFuelEditor from "./VehicleFuelEditor";
import VehicleDataEditor from "./VehicleDataEditor";
import { toggleVehiculo } from "./actions";
import { fmtNumber } from "@/lib/format";

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

  const [{ data: vs }, { data: ts }, { data: vc }, { data: ms }, { data: eps }] =
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
      supabase.from("empresas").select("*").eq("activo", true).order("nombre"),
    ]);

  const vehiculos = (vs || []) as Vehiculo[];
  const tipos = (ts || []) as TipoCombustible[];
  const marcas = (ms || []) as Marca[];
  const empresas = (eps || []) as Empresa[];
  const empresaPorId = new Map(empresas.map((e) => [e.id, e.nombre]));

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

      <VehicleForm tipos={tipos} marcas={marcas} empresas={empresas} />

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
                <p className="text-xs text-slate-400">
                  {v.capacidad_tanque_litros != null
                    ? `Tanque ${fmtNumber(v.capacidad_tanque_litros, 0)} L`
                    : "Tanque —"}
                  {v.consumo_promedio_asignado != null
                    ? ` · ${fmtNumber(v.consumo_promedio_asignado, 1)} km/l ref.`
                    : ""}
                  {v.es_alquilado
                    ? ` · Alquilado${
                        v.empresa_id && empresaPorId.get(v.empresa_id)
                          ? ` (${empresaPorId.get(v.empresa_id)})`
                          : ""
                      }`
                    : ""}
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

            <VehicleDataEditor vehiculo={v} empresas={empresas} />
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
