import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TONOS, type Tono } from "./Etiqueta";

/** Aviso: tarjeta de color suave con ícono, título, ayuda y flecha si se puede tocar. */
export default function Aviso({
  tono = "alerta",
  icono,
  titulo,
  children,
  href,
}: {
  tono?: Tono;
  icono: React.ReactNode;
  titulo: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
}) {
  const contenido = (
    <div className={`flex items-start gap-3 rounded-tarjeta p-4 ${TONOS[tono]}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-tinta">{titulo}</p>
        {children ? <div className="mt-0.5 text-sm font-semibold text-suave">{children}</div> : null}
      </div>
      {href ? <ChevronRight className="mt-2 shrink-0" size={20} strokeWidth={2.6} /> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition active:scale-[0.99]">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}
