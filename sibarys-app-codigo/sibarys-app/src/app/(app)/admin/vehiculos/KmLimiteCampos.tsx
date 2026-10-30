/** Campos del control de km de un vehículo alquilado (alta y edición). */
export default function KmLimiteCampos({
  desde,
  limite,
  aviso,
  inicial,
}: {
  desde?: string | null;
  limite?: number | null;
  aviso?: number | null;
  inicial?: number | null;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
      <p className="text-xs font-semibold uppercase text-slate-500">Límite de km del alquiler</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Controlar km desde</label>
          <input name="km_control_desde" type="date" className="field" defaultValue={desde ?? ""} />
        </div>
        <div>
          <label className="label">Límite (km)</label>
          <input
            name="km_limite"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className="field"
            defaultValue={limite ?? 5000}
          />
        </div>
        <div>
          <label className="label">Avisar cuando falten (km)</label>
          <input
            name="km_aviso"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="field"
            defaultValue={aviso ?? 500}
          />
        </div>
        <div>
          <label className="label">Km al inicio (opcional)</label>
          <input
            name="km_inicial"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="field"
            defaultValue={inicial ?? ""}
            placeholder="Odómetro"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Si no cargás los km al inicio, se toma el odómetro de la primera carga desde esa fecha.
        Dejá la fecha vacía para no controlar.
      </p>
    </div>
  );
}
