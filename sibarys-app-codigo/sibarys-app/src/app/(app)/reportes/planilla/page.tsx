import { soloAdmin } from "@/lib/soloAdmin";
import { referenciaL100 } from "@/lib/consumo";
import type { VehiculoPlanilla } from "@/lib/planillaCombustible";
import ReportesNav from "@/components/ReportesNav";
import PlanillaPanel from "./PlanillaPanel";

export const dynamic = "force-dynamic";

export default async function PlanillaPage() {
  const supabase = await soloAdmin();
  const [{ data: vs }, { data: es }] = await Promise.all([
    supabase.from("vehiculos").select("*").order("nombre"),
    supabase.from("empresas").select("id, nombre"),
  ]);
  const empresa = new Map((es || []).map((e: any) => [e.id as string, e.nombre as string]));
  const vehiculos: VehiculoPlanilla[] = (vs || []).map((v: any) => ({
    id: v.id,
    nombre: v.nombre,
    patente: v.patente,
    marca: v.marca ?? null,
    modelo: v.modelo ?? null,
    es_alquilado: !!v.es_alquilado,
    empresa: v.empresa_id ? (empresa.get(v.empresa_id) ?? null) : null,
    ref_l100: referenciaL100(v),
    activo: v.activo !== false,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reportes</h1>
      <ReportesNav />
      <div>
        <h2 className="text-base font-semibold text-slate-700">
          Planilla de combustible
        </h2>
        <p className="text-sm text-slate-500">
          El Excel de control con el formato de Dirección. Elegí las fechas y
          descargalo.
        </p>
      </div>
      <PlanillaPanel vehiculos={vehiculos} />
    </div>
  );
}
