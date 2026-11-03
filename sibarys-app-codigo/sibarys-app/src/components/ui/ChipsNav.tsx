"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sub-navegación en chips con scroll horizontal (solo celular; en la compu va en la barra lateral). */
export default function ChipsNav({
  tabs,
  raiz,
  siempre = false,
}: {
  tabs: { href: string; label: string }[];
  /** Ruta que solo se marca activa si coincide exacto (ej. "/reportes") */
  raiz?: string;
  /** Mostrar también en la computadora */
  siempre?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className={`sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 py-1 ${siempre ? "" : "lg:hidden"}`}
    >
      {tabs.map((t) => {
        const activo =
          t.href === raiz ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={activo ? "chip-on" : "chip"} aria-current={activo ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
