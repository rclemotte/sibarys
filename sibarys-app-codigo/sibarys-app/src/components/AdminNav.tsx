"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/vehiculos", label: "Vehículos" },
  { href: "/admin/asignaciones", label: "Asignaciones" },
  { href: "/admin/tarifas", label: "Tarifas" },
  { href: "/admin/combustibles", label: "Combustibles" },
  { href: "/admin/marcas", label: "Marcas" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/emblemas", label: "Emblemas" },
  { href: "/admin/estaciones", label: "Estaciones" },
  { href: "/admin/choferes", label: "Choferes" },
  { href: "/admin/exportar", label: "Exportar" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
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
