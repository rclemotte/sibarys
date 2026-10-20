"use client";

import { useState } from "react";
import { hoyLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { traerCargasExport } from "@/lib/exportCargas";
import type { VehiculoPlanilla } from "@/lib/planillaCombustible";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function PlanillaPanel({
  vehiculos,
}: {
  vehiculos: VehiculoPlanilla[];
}) {
  const hoy = hoyLocal();
  const [desde, setDesde] = useState(hoy.slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoy);
  const [cargando, setCargando] = useState(false);
  const [info, setInfo] = useState<{ ok: boolean; msg: string } | null>(null);

  async function generar() {
    if (!desde || !hasta || desde > hasta) {
      setInfo({ ok: false, msg: "Revisá las fechas: «Desde» tiene que ser antes de «Hasta»." });
      return;
    }
    setCargando(true);
    setInfo(null);
    try {
      const supabase = createClient();
      const anio = hasta.slice(0, 4);
      const [cargas, cargasAnio, ExcelMod, { construirPlanilla }] = await Promise.all([
        traerCargasExport(supabase, { desde, hasta }),
        traerCargasExport(supabase, { desde: `${anio}-01-01`, hasta }),
        import("exceljs"),
        import("@/lib/planillaCombustible"),
      ]);
      if (cargas.length === 0) {
        setInfo({ ok: false, msg: "No hay cargas en esas fechas." });
        return;
      }
      const Excel = (ExcelMod as any).default ?? ExcelMod;
      const wb = construirPlanilla(Excel, { desde, hasta, cargas, cargasAnio, vehiculos });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      // Nombre: "Combustible_Octubre_2026.xlsx" si es un mes completo
      const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7) && desde.endsWith("-01");
      const nombre = mismoMes
        ? `Combustible_${MESES[Number(desde.slice(5, 7)) - 1]}_${desde.slice(0, 4)}.xlsx`
        : `Combustible_${desde}_al_${hasta}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setInfo({ ok: true, msg: `Planilla generada con ${cargas.length} carga(s).` });
    } catch (e: any) {
      setInfo({ ok: false, msg: "No se pudo generar: " + (e?.message || e) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card space-y-4">
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

      <ul className="space-y-1 text-xs text-slate-500">
        <li>• Una hoja por modelo de vehículo (los alquilados juntos), con cada carga, km recorridos, consumo e importe por emblema.</li>
        <li>• Resumen por móvil, con totales por grupo.</li>
        <li>• Litros y monto por tipo de combustible, día por día.</li>
        <li>• Acumulado del año, mes por mes.</li>
      </ul>

      {info ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${info.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {info.msg}
        </p>
      ) : null}

      <button type="button" className="btn-primary w-full" onClick={generar} disabled={cargando}>
        {cargando ? "Generando…" : "⬇ Descargar planilla"}
      </button>
    </div>
  );
}
