import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import Encabezado from "@/components/ui/Encabezado";
import ExportCatalogos from "./ExportCatalogos";

export const dynamic = "force-dynamic";

export default async function ListadosPage() {
  await soloAdmin();
  return (
    <div className="space-y-5">
      <Encabezado titulo="Listados" subtitulo="Vehículos, estaciones, choferes y demás listas en Excel, cada una en su archivo o todas juntas." />
      <ReportesNav />
      <ExportCatalogos />
    </div>
  );
}
