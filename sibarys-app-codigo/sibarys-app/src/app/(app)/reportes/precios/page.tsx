import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import ControlPreciosPanel from "./ControlPreciosPanel";

export const dynamic = "force-dynamic";

export default async function ControlPreciosPage() {
  await soloAdmin();
  return (
    <div className="space-y-4 lg:relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-3rem))] lg:-translate-x-1/2">
      <h1 className="text-xl font-bold">Reportes</h1>
      <ReportesNav />
      <div>
        <h2 className="text-base font-semibold text-slate-700">Control de precios</h2>
        <p className="text-sm text-slate-500">
          Compara lo que pagó cada carga por litro con el precio de referencia del emblema y
          combustible (Admin → Precios) vigente ese día.
        </p>
      </div>
      <ControlPreciosPanel />
    </div>
  );
}
