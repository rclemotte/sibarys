"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Fuel, House, Menu } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Inicio", Icono: House },
  { href: "/historial", label: "Historial", Icono: ClipboardList },
  { href: "/cargar", label: "Cargar", Icono: Fuel, centro: true },
  { href: "/reportes", label: "Reportes", Icono: BarChart3 },
  { href: "/mas", label: "Más", Icono: Menu, extra: ["/admin", "/mas"] },
];

/** Barra inferior flotante (solo celular). */
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-30 rounded-[28px] bg-white/85 px-2 py-2 shadow-flotante backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5 items-end">
        {items.map(({ href, label, Icono, centro, extra }) => {
          const rutas = extra ?? [href];
          const activo = rutas.some((r) => pathname === r || pathname.startsWith(r + "/"));
          if (centro)
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label="Cargar combustible"
                  className={`-mt-8 flex h-16 w-16 flex-col items-center justify-center rounded-[22px] bg-marca text-tinta shadow-boton ring-4 ring-fondo transition active:scale-95 ${
                    activo ? "brightness-110" : ""
                  }`}
                >
                  <Icono size={26} strokeWidth={2.4} />
                  <span className="text-[10px] font-extrabold leading-tight">{label}</span>
                </Link>
              </li>
            );
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-extrabold transition active:scale-95 ${
                  activo ? "bg-marca text-tinta shadow-boton" : "text-tenue hover:text-suave"
                }`}
              >
                <Icono size={22} strokeWidth={2.4} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
