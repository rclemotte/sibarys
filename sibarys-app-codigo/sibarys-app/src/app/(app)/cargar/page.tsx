import { createClient } from "@/lib/supabase/server";
import { esAdminRol, tienePermiso } from "@/lib/permisos";
import type {
  VehiculoParaCarga,
  PrecioVigente,
  EstacionParaCarga,
} from "@/lib/types";
import FuelForm from "./FuelForm";

export const dynamic = "force-dynamic";

export default async function CargarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user!.id)
    .single();
  const esAdmin = esAdminRol(perfil?.rol);

  // Administración puede registrar cargas que un chofer se olvidó de cargar
  const puedeOlvidadas = tienePermiso(perfil, "puede_corregir_km");
  let choferes: { id: string; nombre: string }[] = [];
  if (puedeOlvidadas) {
    const { data: ps } = await supabase
      .from("perfiles")
      .select("id, nombre_completo")
      .order("nombre_completo");
    choferes = (ps || []).map((p: any) => ({
      id: p.id as string,
      nombre: (p.nombre_completo as string) || "(sin nombre)",
    }));
  }

  // 1) Vehículos disponibles: todos los activos, para admin y choferes
  //    (cualquier chofer puede cargar en cualquier vehículo; no hay asignaciones)
  const { data: activos } = await supabase
    .from("vehiculos")
    .select("id")
    .eq("activo", true);
  const vehiculoIds: string[] = (activos || []).map((v) => v.id as string);

  // Estaciones de servicio activas (para el desplegable de la carga)
  const { data: estData } = await supabase
    .from("estaciones_servicio")
    .select("id, nombre, localidad, activo, emblemas(nombre)")
    .eq("activo", true)
    .order("nombre");
  const estaciones: EstacionParaCarga[] = (
    (estData || []) as unknown as {
      id: string;
      nombre: string;
      localidad: string | null;
      emblemas: { nombre: string } | null;
    }[]
  ).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    localidad: e.localidad,
    emblema_nombre: e.emblemas?.nombre ?? null,
  }));

  const { data: embData } = await supabase
    .from("emblemas")
    .select("id, nombre, activo")
    .order("nombre");
  const emblemas = (embData || [])
    .filter((e: any) => e.activo !== false)
    .map((e: any) => ({ id: e.id as string, nombre: e.nombre as string }));

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
            : "Todavía no hay vehículos cargados. Avisale al administrador."}
        </div>
      ) : (
        <FuelForm
          vehiculos={vehiculos}
          estaciones={estaciones}
          emblemas={emblemas}
          choferes={puedeOlvidadas ? choferes : undefined}
        />
      )}
    </div>
  );
}
