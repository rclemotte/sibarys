import Link from "next/link";

/** Tarjeta-botón grande con ícono arriba y texto abajo. */
export default function AccesoRapido({
  href,
  icono,
  titulo,
  texto,
  destacado = false,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  texto?: string;
  destacado?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-3 rounded-tarjeta p-4 transition active:scale-[0.98] lg:p-5 ${
        destacado ? "bg-marca text-white shadow-boton" : "bg-white text-tinta shadow-suave hover:shadow-flotante"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          destacado ? "bg-white/20 text-white" : "bg-brand-suave text-brand"
        }`}
      >
        {icono}
      </span>
      <span>
        <span className="block font-display text-lg font-extrabold leading-tight">{titulo}</span>
        {texto ? (
          <span className={`block text-xs font-semibold ${destacado ? "text-white/80" : "text-suave"}`}>{texto}</span>
        ) : null}
      </span>
    </Link>
  );
}
