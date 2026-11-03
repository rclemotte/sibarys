"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Fuel, House, Settings, type LucideIcon } from "lucide-react";
import { REPORTES_TABS } from "@/components/ReportesNav";
import { ICONO_REPORTE, INFO_ADMIN } from "@/lib/navInfo";

function Item({
  href,
  label,
  Icono,
  activo,
  chico = false,
}: {
  href: string;
  label: string;
  Icono: LucideIcon;
  activo: boolean;
  chico?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl transition ${
        chico ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-[15px]"
      } font-extrabold ${
        activo ? "bg-marca text-white shadow-boton" : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icono size={chico ? 18 : 20} strokeWidth={2.4} />
      {label}
    </Link>
  );
}

/** Barra lateral fija (computadora). */
export default function Sidebar({
  esAdmin,
  adminTabs,
  nombre,
  rol,
  iniciales,
  salir,
}: {
  esAdmin: boolean;
  adminTabs: { href: string; label: string }[];
  nombre: string;
  rol: string;
  iniciales: string;
  salir: React.ReactNode;
}) {
  const p = usePathname();
  const es = (h: string) => p === h || p.startsWith(h + "/");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-tinta px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-blanco.png" alt="Sibarys" className="h-16 w-auto" />
        <span className="text-xs font-extrabold uppercase tracking-widest text-oro">Combustible</span>
      </Link>
      <nav aria-label="Navegación principal" className="sin-barra flex-1 space-y-1 overflow-y-auto">
        <Item href="/dashboard" label="Inicio" Icono={House} activo={es("/dashboard")} />
        <Item href="/cargar" label="Cargar combustible" Icono={Fuel} activo={es("/cargar")} />
        <Item href="/historial" label="Historial" Icono={ClipboardList} activo={es("/historial")} />
        <Item href="/reportes" label="Reportes" Icono={BarChart3} activo={!esAdmin && es("/reportes")} />
        {esAdmin ? (
          <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
            {REPORTES_TABS.map((t) => (
              <Item
                key={t.href}
                href={t.href}
                label={t.label}
                Icono={ICONO_REPORTE[t.href] ?? BarChart3}
                activo={t.href === "/reportes" ? p === "/reportes" : es(t.href)}
                chico
              />
            ))}
          </div>
        ) : null}
        {adminTabs.length > 0 ? (
          <>
            <p className="flex items-center gap-2 px-3 pb-1 pt-5 text-xs font-extrabold uppercase tracking-widest text-white/40">
              <Settings size={14} strokeWidth={2.6} /> Administración
            </p>
            {adminTabs.map((t) => (
              <Item
                key={t.href}
                href={t.href}
                label={t.label}
                Icono={INFO_ADMIN[t.href]?.icono ?? Settings}
                activo={es(t.href)}
                chico
              />
            ))}
          </>
        ) : null}
      </nav>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-oro font-display text-base font-extrabold text-tinta">
          {iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-white">{nombre}</p>
          <p className="text-xs font-semibold text-white/50">{rol}</p>
        </div>
        {salir}
      </div>
    </aside>
  );
}
