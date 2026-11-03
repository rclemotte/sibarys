/** Tarjeta con título de sección (formularios agrupados). */
export default function Seccion({
  titulo,
  icono,
  derecha,
  children,
  className = "",
}: {
  titulo?: React.ReactNode;
  icono?: React.ReactNode;
  derecha?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {titulo ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            {icono ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-suave text-brand">{icono}</span>
            ) : null}
            {titulo}
          </h2>
          {derecha}
        </div>
      ) : null}
      {children}
    </section>
  );
}
