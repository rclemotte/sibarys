import { Bloque, ListaEsqueleto } from "@/components/ui/Esqueleto";

/** Mientras carga una pantalla: esqueleto con la forma del contenido. */
export default function Cargando() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="-mx-4 -mt-4 h-36 animate-pulse rounded-b-[32px] bg-marca opacity-80 lg:mx-0 lg:mt-0 lg:rounded-[28px]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bloque key={i} className="h-24 rounded-tarjeta" />
        ))}
      </div>
      <ListaEsqueleto filas={5} />
    </div>
  );
}
