/** Bloque de carga con la forma del contenido. */
export function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-linea/70 ${className}`} />;
}

/** Esqueleto de una lista de filas. */
export function ListaEsqueleto({ filas = 5 }: { filas?: number }) {
  return (
    <div className="card space-y-4">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bloque className="h-11 w-11" />
          <div className="flex-1 space-y-2">
            <Bloque className="h-3.5 w-1/2" />
            <Bloque className="h-3 w-3/4" />
          </div>
          <Bloque className="h-6 w-14" />
        </div>
      ))}
    </div>
  );
}
