import { createClient } from "@/lib/supabase/server";
import type { VehiculoParaCarga, PrecioVigente } from "@/lib/types";
import FuelForm from "./FuelForm";

export const dynamic = "force-dynamic";

export default async function CargarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user!.id)
    .single();
  const esAdmin = perfil?.rol === "admin";

  // 1) Vehículos disponibles: admin ve todos; chofer, solo los asignados
  let vehiculoIds: string[] = [];
  if (esAdmin) {
    const { data } = await supabase
      .from("vehiculos")
      .select("id")
      .eq("activo", true);
    vehiculoIds = (data || []).map((v) => v.id as string);
  } else {
    const { data } = await supabase
      .from("asignaciones")
      .select("vehiculo_id")
      .eq("chofer_id", user!.id)
      .eq("activo", true);
    vehiculoIds = (data || []).map((a) => a.vehiculo_id as string);
  }

  let vehiculos: VehiculoParaCarga[] = [];

  if (vehiculoIds.length > 0) {
    // 2) Datos de los vehículos
    const { data: vs } = await supabase
      .from("vehiculos")
      .select("id, nombre, patente, activo")
      .in("id", vehiculoIds)
      .eq("activo", true)
      .order("nombre");

    // 3) Combustibles permitidos por vehículo
    const { data: vc } = await supabase
      .from("vehiculo_combustibles")
      .select("vehiculo_id, tipos_combustible(id, nombre)")
      .in("vehiculo_id", vehiculoIds);

    // 4) Precios vigentes por tipo de combustible
    const { data: precios } = await supabase
      .from("precios_vigentes")
      .select("*");
    const precioPorTipo = new Map<string, number>();
    (precios || []).forEach((p: PrecioVigente) =>
      precioPorTipo.set(p.tipo_combustible_id, Number(p.precio))
    );

    const combustiblesPorVehiculo = new Map<
      string,
      { id: string; nombre: string; precio_vigente: number | null }[]
    >();
    (vc || []).forEach((row: any) => {
      const tc = row.tipos_combustible;
      if (!tc) return;
      const arr = combustiblesPorVehiculo.get(row.vehiculo_id) || [];
      arr.push({
        id: tc.id,
        nombre: tc.nombre,
        precio_vigente: precioPorTipo.get(tc.id) ?? null,
      });
      combustiblesPorVehiculo.set(row.vehiculo_id, arr);
    });

    vehiculos = (vs || []).map((v) => ({
      id: v.id as string,
      nombre: v.nombre as string,
      patente: v.patente as string,
      combustibles: (combustiblesPorVehiculo.get(v.id as string) || []).sort(
        (a, b) => a.nombre.localeCompare(b.nombre)
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Nueva carga</h1>
        <p className="text-sm text-slate-500">
          Registrá el kilometraje y los litros cargados.
        </p>
      </div>

      {vehiculos.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          {esAdmin
            ? "No hay vehículos cargados. Agregá la flota en Admin → Vehículos."
            : "No tenés vehículos asignados. Pedile al administrador que te asigne uno."}
        </div>
      ) : (
        <FuelForm vehiculos={vehiculos} />
      )}
    </div>
  );
}
