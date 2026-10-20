import { redirect } from "next/navigation";

/** Exportar se mudó a Reportes → Detalle de cargas. */
export default function ExportarPage() {
  redirect("/reportes/detalle");
}
