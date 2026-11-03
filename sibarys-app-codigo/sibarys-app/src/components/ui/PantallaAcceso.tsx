/** Pantallas de acceso (login, contraseña): degradé con el logo y una hoja blanca con el formulario. */
export default function PantallaAcceso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-marca lg:items-center lg:justify-center lg:py-10">
      <div className="relative overflow-hidden px-6 pb-14 pt-[calc(env(safe-area-inset-top)+44px)] text-white lg:w-[460px] lg:px-0 lg:pb-8 lg:pt-0 lg:text-center">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 lg:hidden" viewBox="0 0 200 200">
          <circle cx="120" cy="80" r="90" fill="white" opacity="0.07" />
          <g stroke="white" strokeLinecap="round" opacity="0.15" strokeWidth="7">
            <line x1="40" y1="120" x2="120" y2="120" />
            <line x1="65" y1="142" x2="135" y2="142" />
            <line x1="90" y1="164" x2="142" y2="164" />
          </g>
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-blanco.png" alt="Sibarys Transporte y Turismo" className="relative mb-6 h-24 w-auto lg:mx-auto lg:h-28" />
        <h1 className="relative font-display text-[32px] font-extrabold leading-tight">{titulo}</h1>
        <p className="relative mt-1 font-semibold text-white/80">{subtitulo}</p>
      </div>
      <div className="-mt-8 flex-1 rounded-t-[32px] bg-fondo px-5 pb-10 pt-8 lg:mt-0 lg:w-[460px] lg:flex-none lg:rounded-[32px] lg:p-8 lg:shadow-flotante">
        {children}
      </div>
    </main>
  );
}
