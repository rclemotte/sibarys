/** Estado vacío amable. */
export default function Vacio({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-suave text-brand">{icono}</span>
      <p className="font-display text-lg font-extrabold">{titulo}</p>
      {texto ? <p className="max-w-xs text-sm font-semibold text-suave">{texto}</p> : null}
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  );
}
