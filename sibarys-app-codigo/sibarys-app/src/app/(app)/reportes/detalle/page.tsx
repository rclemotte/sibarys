import type { Perfil, Vehiculo } from "@/lib/types";
import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import Encabezado from "@/components/ui/Encabezado";
import ExportPanel from "./ExportPanel";

export const dynamic = "force-dynamic";

export default async function DetalleCargasPage() {
  const supabase = await soloAdmin();

  const [{ data: ps }, { data: vs }, { data: es }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo")
      .order("nombre_completo"),
    supabase.from("vehiculos").select("id, nombre, patente").order("nombre"),
    supabase.from("emblemas").select("id, nombre").order("nombre"),
  ]);

  const choferes = ((ps || []) as Pick<Perfil, "id" | "nombre_completo">[]).map(
    (p) => ({ id: p.id, nombre: p.nombre_completo || "(sin nombre)" }),
  );
  const vehiculos = (
    (vs || []) as Pick<Vehiculo, "id" | "nombre" | "patente">[]
  ).map((v) => ({ id: v.id, nombre: `${v.nombre} — ${v.patente}` }));
  const emblemas = (es || []).map((e: any) => ({
    id: e.id as string,
    nombre: e.nombre as string,
  }));

  return (
    <div className="space-y-5">
      <Encabezado titulo="Detalle de cargas" subtitulo="Descargá un Excel o abrí un PDF para ver e imprimir las cargas y su consumo." />
      <ReportesNav />
      <ExportPanel
        choferes={choferes}
        vehiculos={vehiculos}
        emblemas={emblemas}
      />
    </div>
  );
}
