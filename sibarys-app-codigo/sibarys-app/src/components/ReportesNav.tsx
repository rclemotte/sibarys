import ChipsNav from "@/components/ui/ChipsNav";

/** Pestañas de Reportes. Las de descarga son solo para administración. */
export const REPORTES_TABS = [
  { href: "/reportes", label: "Análisis" },
  { href: "/reportes/detalle", label: "Detalle de cargas" },
  { href: "/reportes/planilla", label: "Planilla de combustible" },
  { href: "/reportes/precios", label: "Control de precios" },
  { href: "/reportes/km-alquilados", label: "Km alquilados" },
  { href: "/reportes/listados", label: "Listados" },
];

/** Chips de Reportes en el celular (en la compu están en la barra lateral). */
export default function ReportesNav() {
  return <ChipsNav tabs={REPORTES_TABS} raiz="/reportes" />;
}
