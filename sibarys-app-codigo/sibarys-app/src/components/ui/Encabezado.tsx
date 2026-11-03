import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Formas decorativas: líneas de velocidad y ruta, apenas visibles. */
function Decoracion() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMaxYMid slice"
    >
      <circle cx="360" cy="10" r="90" fill="white" opacity="0.07" />
      <circle cx="390" cy="170" r="55" fill="white" opacity="0.05" />
      <g stroke="white" strokeLinecap="round" opacity="0.14">
        <line x1="250" y1="62" x2="330" y2="62" strokeWidth="6" />
        <line x1="275" y1="82" x2="345" y2="82" strokeWidth="6" />
        <line x1="300" y1="102" x2="352" y2="102" strokeWidth="6" />
      </g>
      <path
        d="M-10 190 C 90 140, 170 200, 260 150 S 380 120, 420 140"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeDasharray="2 12"
        strokeLinecap="round"
        opacity="0.22"
      />
    </svg>
  );
}

/**
 * Encabezado de pantalla con el degradé de marca. En el celular ocupa todo
 * el ancho; en la computadora es una tarjeta grande dentro del contenido.
 */
export default function Encabezado({
  titulo,
  subtitulo,
  volver,
  accion,
  children,
  extraAbajo = false,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  /** Link de "Volver" */
  volver?: string;
  /** Botón de acción arriba a la derecha (usar <AccionEncabezado/>) */
  accion?: React.ReactNode;
  /** Buscador o fila de filtros dentro del encabezado */
  children?: React.ReactNode;
  /** Deja espacio abajo para montar KPIs encima */
  extraAbajo?: boolean;
}) {
  return (
    <header
      className={`relative -mx-4 -mt-4 overflow-hidden rounded-b-[32px] bg-oscuro px-5 pt-[calc(env(safe-area-inset-top)+20px)] text-white lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:px-8 lg:pt-7 ${
        extraAbajo ? "pb-14" : "pb-6"
      }`}
    >
      <Decoracion />
      <div className="relative">
        {volver ? (
          <Link
            href={volver}
            className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-white/80 hover:text-white"
          >
            <ChevronLeft size={18} strokeWidth={2.6} /> Volver
          </Link>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-extrabold leading-tight lg:text-[34px]">{titulo}</h1>
            {subtitulo ? <p className="mt-0.5 text-sm font-semibold text-white/80 lg:text-base">{subtitulo}</p> : null}
          </div>
          {accion ? <div className="shrink-0">{accion}</div> : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </header>
  );
}

/** Botón cuadrado blanco con ícono, para la esquina del encabezado. */
export function AccionEncabezado({
  href,
  icono,
  etiqueta,
}: {
  href: string;
  icono: React.ReactNode;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-dark shadow-flotante transition active:scale-95"
    >
      {icono}
    </Link>
  );
}
