import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import Encabezado from "@/components/ui/Encabezado";
import ControlPreciosPanel from "./ControlPreciosPanel";

export const dynamic = "force-dynamic";

export default async function ControlPreciosPage() {
  await soloAdmin();
  return (
    <div className="space-y-5">
      <Encabezado titulo="Control de precios" subtitulo="Compara lo que pagó cada carga por litro con el precio de referencia del emblema y combustible (Admin → Precios) vigente ese día." />
      <ReportesNav />
      <ControlPreciosPanel />
    </div>
  );
}
