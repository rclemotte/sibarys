"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };

const base: Item[] = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/cargar", label: "Cargar", icon: "⛽" },
  { href: "/historial", label: "Historial", icon: "📋" },
  { href: "/reportes", label: "Reportes", icon: "📊" },
];

const adminItem: Item = { href: "/admin/vehiculos", label: "Admin", icon: "⚙️" };

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...base, adminItem] : base;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-1.5">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${
                active ? "text-brand" : "text-slate-400"
              }`}
            >
              <span className="text-xl leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
