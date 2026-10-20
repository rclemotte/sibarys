import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import ExportCatalogos from "./ExportCatalogos";

export const dynamic = "force-dynamic";

export default async function ListadosPage() {
  await soloAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reportes</h1>
      <ReportesNav />
      <div>
        <h2 className="text-base font-semibold text-slate-700">Listados</h2>
        <p className="text-sm text-slate-500">
          Vehículos, estaciones, choferes y demás listas en Excel, cada una en
          su archivo o todas juntas.
        </p>
      </div>
      <ExportCatalogos />
    </div>
  );
}
