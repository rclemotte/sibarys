import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdminRol } from "@/lib/permisos";
import { fmtDate } from "@/lib/format";
import { totalesExport, traerCargasExport } from "@/lib/exportCargas";
import ReporteCargas from "./ReporteCargas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reporte de cargas — Sibarys" };

type Params = {
  chofer?: string;
  vehiculo?: string;
  emblema?: string;
  desde?: string;
  hasta?: string;
};

const fecha = (ymd?: string) => (ymd ? fmtDate(`${ymd}T12:00:00Z`) : "");

/** Reporte de cargas listo para imprimir o guardar en PDF desde el navegador. */
export default async function ImprimirCargasPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: yo } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!esAdminRol(yo?.rol)) redirect("/dashboard");

  const f = searchParams;
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  const desde = f.desde && ymd.test(f.desde) ? f.desde : undefined;
  const hasta = f.hasta && ymd.test(f.hasta) ? f.hasta : undefined;

  const [filas, nombres] = await Promise.all([
    traerCargasExport(supabase, {
      choferId: f.chofer,
      vehiculoId: f.vehiculo,
      emblemaId: f.emblema,
      desde,
      hasta,
    }),
    Promise.all([
      f.chofer
        ? supabase.from("perfiles").select("nombre_completo").eq("id", f.chofer).maybeSingle()
        : Promise.resolve({ data: null }),
      f.vehiculo
        ? supabase.from("vehiculos").select("nombre, patente").eq("id", f.vehiculo).maybeSingle()
        : Promise.resolve({ data: null }),
      f.emblema
        ? supabase.from("emblemas").select("nombre").eq("id", f.emblema).maybeSingle()
        : Promise.resolve({ data: null }),
    ]),
  ]);
  const [{ data: ch }, { data: ve }, { data: em }] = nombres as any[];
  const t = totalesExport(filas);

  const periodo =
    desde && hasta
      ? `${fecha(desde)} al ${fecha(hasta)}`
      : desde
        ? `Desde ${fecha(desde)}`
        : hasta
          ? `Hasta ${fecha(hasta)}`
          : "Todas las fechas";
  const filtros = [
    ["Período", periodo],
    ["Chofer", ch?.nombre_completo ?? "Todos"],
    ["Vehículo", ve ? `${ve.nombre} — ${ve.patente}` : "Todos"],
    ["Emblema", em?.nombre ?? "Todos"],
  ];

  return (
    <ReporteCargas
      filas={filas}
      filtros={filtros}
      t={t}
      generado={new Date().toISOString()}
    />
  );
}
