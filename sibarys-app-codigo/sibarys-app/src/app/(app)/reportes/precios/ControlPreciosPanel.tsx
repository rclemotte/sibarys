"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fmtDateTime, fmtMoney, fmtNumber, hoyLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { traerCargasExport } from "@/lib/exportCargas";
import { controlarPrecios, type FilaControl, type PrecioRef } from "@/lib/controlPrecios";

const TOLERANCIAS = [1, 2, 3, 5];

export default function ControlPreciosPanel() {
  const hoy = hoyLocal();
  const [desde, setDesde] = useState(hoy.slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoy);
  const [tol, setTol] = useState(2);
  const [soloDif, setSoloDif] = useState(true);
  const [filas, setFilas] = useState<FilaControl[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      const supabase = createClient();
      const [cargas, precios] = await Promise.all([
        traerCargasExport(supabase, { desde, hasta }),
        supabase
          .from("precios_emblema")
          .select("emblema_id, tipo_combustible_id, precio, vigente_desde")
          .lte("vigente_desde", hasta),
      ]);
      if (precios.error) {
        setError("Falta correr el SQL migracion_precios_emblema.sql en Supabase.");
        return;
      }
      setFilas(controlarPrecios(cargas, (precios.data || []) as PrecioRef[]));
    } catch (e: any) {
      setError("No se pudo consultar: " + (e?.message || e));
    } finally {
      setCargando(false);
    }
  }

  const res = useMemo(() => {
    if (!filas) return null;
    const controladas = filas.filter((r) => r.difPct != null);
    const fuera = controladas.filter((r) => Math.abs(r.difPct!) > tol);
    const deMas = fuera.filter((r) => r.difGs! > 0).reduce((s, r) => s + r.difGs!, 0);
    const deMenos = fuera.filter((r) => r.difGs! < 0).reduce((s, r) => s - r.difGs!, 0);
    const sinControl = filas.filter((r) => r.difPct == null);
    const lista = (soloDif ? fuera : filas)
      .slice()
      .sort((a, b) => Math.abs(b.difPct ?? -1) - Math.abs(a.difPct ?? -1));
    return { controladas, fuera, deMas, deMenos, sinControl, lista };
  }, [filas, tol, soloDif]);

  function descargar() {
    if (!res) return;
    const datos = res.lista.map((r) => ({
      Fecha: fmtDateTime(r.registrado_en),
      Vehículo: r.vehiculo_nombre,
      Patente: r.patente,
      Chofer: r.chofer_nombre ?? "",
      Estación: r.estacion ?? "",
      Emblema: r.emblema ?? "",
      Combustible: r.combustible_nombre ?? "",
      Litros: Number(r.litros),
      "Pagó ₲/L": r.pagado != null ? Math.round(r.pagado) : "",
      "Referencia ₲/L": r.referencia ?? "",
      "Diferencia %": r.difPct != null ? Math.round(r.difPct * 10) / 10 : "",
      "Diferencia ₲": r.difGs != null ? Math.round(r.difGs) : "",
      Observación:
        r.motivoSinControl === "sin_emblema"
          ? "Sin estación ni emblema"
          : r.motivoSinControl === "sin_precio"
            ? "Sin precio de referencia"
            : "",
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Control de precios");
    XLSX.writeFile(wb, `sibarys-control-precios-${desde}_al_${hasta}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="field" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="field" value={hasta} max={hoy} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Avisar si la diferencia supera</label>
            <select className="field" value={tol} onChange={(e) => setTol(Number(e.target.value))}>
              {TOLERANCIAS.map((t) => (
                <option key={t} value={t}>
                  {t}%
                </option>
              ))}
            </select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={soloDif}
              onChange={(e) => setSoloDif(e.target.checked)}
            />
            Ver solo las que tienen diferencia
          </label>
        </div>
        {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
        <button type="button" className="btn-primary w-full" onClick={consultar} disabled={cargando}>
          {cargando ? "Revisando…" : "Revisar precios"}
        </button>
      </div>

      {res ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="card">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Controladas</p>
              <p className="text-xl font-bold">{fmtNumber(res.controladas.length)}</p>
              <p className="text-xs text-slate-500">de {fmtNumber(filas!.length)} cargas</p>
            </div>
            <div className="card">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Con diferencia</p>
              <p className={`text-xl font-bold ${res.fuera.length ? "text-red-600" : ""}`}>
                {fmtNumber(res.fuera.length)}
              </p>
              <p className="text-xs text-slate-500">más de {tol}% arriba o abajo</p>
            </div>
            <div className="card">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Pagado de más</p>
              <p className={`text-xl font-bold ${res.deMas ? "text-red-600" : ""}`}>{fmtMoney(res.deMas)}</p>
              <p className="text-xs text-slate-500">de menos: {fmtMoney(res.deMenos)}</p>
            </div>
            <div className="card">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Sin control</p>
              <p className="text-xl font-bold">{fmtNumber(res.sinControl.length)}</p>
              <p className="text-xs text-slate-500">sin emblema o sin precio cargado</p>
            </div>
          </div>

          {res.lista.length === 0 ? (
            <div className="card text-center text-sm text-slate-500">
              {soloDif ? "Ninguna carga supera la diferencia elegida. 👍" : "No hay cargas en esas fechas."}
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {["Fecha", "Vehículo · Chofer", "Estación · Emblema", "Combustible", "Litros", "Pagó ₲/L", "Ref. ₲/L", "Dif.", "Dif. ₲"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {res.lista.map((r) => {
                    const fuera = r.difPct != null && Math.abs(r.difPct) > tol;
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="whitespace-nowrap px-3 py-2">{fmtDateTime(r.registrado_en)}</td>
                        <td className="px-3 py-2">
                          <b>{r.vehiculo_nombre}</b>
                          <span className="block text-slate-500">{r.chofer_nombre ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2">
                          {r.estacion ?? "—"}
                          <span className="block text-slate-500">{r.emblema ?? "Sin emblema"}</span>
                        </td>
                        <td className="px-3 py-2">{r.combustible_nombre ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(Number(r.litros), 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.pagado != null ? fmtNumber(r.pagado) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.referencia != null ? fmtNumber(r.referencia) : "—"}</td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${fuera ? (r.difPct! > 0 ? "text-red-600" : "text-blue-700") : "text-slate-500"}`}>
                          {r.difPct != null
                            ? `${r.difPct > 0 ? "+" : ""}${fmtNumber(r.difPct, 1)}%`
                            : r.motivoSinControl === "sin_emblema"
                              ? "Sin emblema"
                              : "Sin precio"}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${fuera && r.difGs! > 0 ? "text-red-600" : ""}`}>
                          {r.difGs != null ? `${r.difGs > 0 ? "+" : ""}${fmtNumber(r.difGs)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {res.lista.length > 0 ? (
            <button type="button" className="btn-ghost w-full" onClick={descargar}>
              ⬇ Descargar esta lista en Excel
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
