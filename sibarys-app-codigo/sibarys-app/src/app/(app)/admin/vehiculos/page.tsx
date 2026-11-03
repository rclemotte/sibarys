import { redirect } from "next/navigation";
import { referenciaL100 } from "@/lib/consumo";
import { tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import type { Vehiculo, TipoCombustible, Marca, Empresa } from "@/lib/types";
import EncabezadoAdmin from "@/components/EncabezadoAdmin";
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!tienePermiso(perfil, "puede_editar_vehiculos")) {
    return (
      <div className="card text-center text-sm text-suave">
        No tenés permiso para esta sección. Pedíselo al súper admin.
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
    <div className="space-y-5">
      <EncabezadoAdmin seccion="/admin/vehiculos" />

      <VehicleForm tipos={tipos} marcas={marcas} empresas={empresas} />

      <ul className="space-y-2">
        {vehiculos.map((v) => (
          <li key={v.id} className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold">
                  {v.nombre}{" "}
                  {!v.activo ? (
                    <span className="ml-1 rounded bg-neutro-suave px-1.5 py-0.5 text-[10px] text-suave">
                      inactivo
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-tenue">
                  {v.patente} · {v.marca || "—"} {v.modelo || ""}{" "}
                  {v.anio ? `· ${v.anio}` : ""}
                </p>
                <p className="text-xs text-tenue">
                  {v.capacidad_tanque_litros != null
                    ? `Tanque ${fmtNumber(v.capacidad_tanque_litros, 0)} L`
                    : "Tanque —"}
                  {referenciaL100(v) != null
                    ? ` · ${fmtNumber(referenciaL100(v), 1)} L/100 km ref.`
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
                  className="rounded-lg border border-linea px-3 py-1.5 text-xs font-bold text-suave hover:bg-fondo"
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
          <li className="card text-center text-sm text-tenue">
            Todavía no hay vehículos.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
