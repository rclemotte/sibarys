import { createClient } from "@/lib/supabase/server";
import { perfilActual, tienePermiso } from "@/lib/permisos";
import { hoyLocal } from "@/lib/format";
import { estadoDe, type FilaMantenimiento } from "@/lib/mantenimiento";
import AdminNav from "@/components/AdminNav";
import MantenimientoPanel, { type RegistroMant } from "./MantenimientoPanel";

export const dynamic = "force-dynamic";

export default async function MantenimientoPage() {
  const supabase = createClient();
  const yo = await perfilActual(supabase);

  if (!tienePermiso(yo, "puede_editar_vehiculos")) {
    return (
      <div className="card text-center text-sm text-slate-500">
        No tenés permiso para esta sección. Pedíselo al súper admin.
      </div>
    );
  }

  const [{ data: estados, error }, { data: historial }] = await Promise.all([
    supabase.from("estado_mantenimiento").select("*").eq("activo", true),
    supabase
      .from("mantenimientos")
      .select(
        "id, vehiculo_id, fecha, km, km_proximo, descripcion, creado_por, perfiles(nombre_completo)",
      )
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(500),
  ]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Administración</h1>
        <AdminNav />
        <div className="card text-sm text-slate-500">
          Falta preparar la base de datos para mantenimientos: corré el SQL{" "}
          <code>migracion_mantenimiento.sql</code> en Supabase.
        </div>
      </div>
    );
  }

  const filas = ((estados || []) as FilaMantenimiento[]).map((f) =>
    estadoDe({
      ...f,
      km_actual: f.km_actual != null ? Number(f.km_actual) : null,
      ultimo_km: f.ultimo_km != null ? Number(f.ultimo_km) : null,
      km_proximo: f.km_proximo != null ? Number(f.km_proximo) : null,
    }),
  );

  const registros: RegistroMant[] = ((historial || []) as any[]).map((h) => ({
    id: h.id,
    vehiculo_id: h.vehiculo_id,
    fecha: h.fecha,
    km: Number(h.km),
    km_proximo: Number(h.km_proximo),
    descripcion: h.descripcion,
    por: h.perfiles?.nombre_completo ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />
      <MantenimientoPanel
        filas={filas}
        registros={registros}
        hoy={hoyLocal()}
      />
    </div>
  );
}
