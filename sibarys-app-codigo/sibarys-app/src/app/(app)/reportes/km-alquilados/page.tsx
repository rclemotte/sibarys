import Link from "next/link";
import { soloAdmin } from "@/lib/soloAdmin";
import ReportesNav from "@/components/ReportesNav";
import Encabezado from "@/components/ui/Encabezado";
import { traerKmAlquilados } from "@/lib/kmAlquilados";
import FilaKm, { ORDEN } from "./FilaKm";
import DescargarKm from "./DescargarKm";

export const dynamic = "force-dynamic";

export default async function KmAlquiladosPage() {
  const supabase = await soloAdmin();
  const lista = await traerKmAlquilados(supabase);

  return (
    <div className="space-y-5">
      <Encabezado titulo="Km de alquilados" subtitulo="Km recorridos por cada vehículo alquilado desde su fecha de control, según el odómetro de las cargas. Se actualiza con cada carga." />
      <ReportesNav />

      {lista === null ? (
        <div className="card text-center text-sm text-alerta">
          Falta correr el SQL migracion_km_alquilados.sql en Supabase.
        </div>
      ) : lista.length === 0 ? (
        <div className="card text-center text-sm text-suave">
          No hay vehículos alquilados activos. Marcalos como alquilados en{" "}
          <Link href="/admin/vehiculos" className="text-brand underline">
            Administración → Vehículos
          </Link>
          .
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {lista
              .slice()
              .sort(
                (a, b) =>
                  ORDEN.indexOf(a.estado) - ORDEN.indexOf(b.estado) ||
                  (a.restantes ?? 0) - (b.restantes ?? 0),
              )
              .map((v) => (
                <FilaKm key={v.id} v={v} />
              ))}
          </ul>
          <DescargarKm filas={lista} />
        </>
      )}
    </div>
  );
}
