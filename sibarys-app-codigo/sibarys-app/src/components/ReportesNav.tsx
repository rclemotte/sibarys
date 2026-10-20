"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Pestañas de Reportes. Las de descarga son solo para administración. */
export const REPORTES_TABS = [
  { href: "/reportes", label: "Análisis" },
  { href: "/reportes/detalle", label: "Detalle de cargas" },
  { href: "/reportes/planilla", label: "Planilla de combustible" },
  { href: "/reportes/listados", label: "Listados" },
];

export default function ReportesNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {REPORTES_TABS.map((t) => {
        const active =
          t.href === "/reportes"
            ? pathname === "/reportes"
            : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-brand text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
