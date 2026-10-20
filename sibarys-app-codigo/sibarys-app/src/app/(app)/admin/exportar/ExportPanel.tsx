"use client";

import { fmtDateTime, hoyLocal } from "@/lib/format";
import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { traerCargasExport } from "@/lib/exportCargas";
import Combobox from "@/components/Combobox";

type Opt = { id: string; nombre: string };

type Formato = "excel" | "pdf";

export default function ExportPanel({
  choferes,
  vehiculos,
  emblemas,
}: {
  choferes: Opt[];
  vehiculos: Opt[];
  emblemas: Opt[];
}) {
  const [choferId, setChoferId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [emblemaId, setEmblemaId] = useState("");
  const [formato, setFormato] = useState<Formato>("excel");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [info, setInfo] = useState<{ tipo: "ok" | "err" | "vacio"; msg: string } | null>(null);

  /** PDF: abre el reporte en otra pestaña, listo para imprimir o guardar. */
  function abrirPdf() {
    const p = new URLSearchParams();
    if (choferId) p.set("chofer", choferId);
    if (vehiculoId) p.set("vehiculo", vehiculoId);
    if (emblemaId) p.set("emblema", emblemaId);
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    window.open(`/imprimir/cargas?${p.toString()}`, "_blank");
    setInfo(null);
  }

  async function descargar() {
    setCargando(true);
    setInfo(null);
    try {
      const cargas = await traerCargasExport(createClient(), {
        choferId,
        vehiculoId,
        emblemaId,
        desde,
        hasta,
      });
      if (cargas.length === 0) {
        setInfo({ tipo: "vacio", msg: "No hay cargas para esos filtros." });
        return;
      }
      const filas = cargas.map((r) => ({
        Fecha: fmtDateTime(r.registrado_en),
        Vehículo: r.vehiculo_nombre,
        Patente: r.patente,
        Chofer: r.chofer_nombre ?? "",
        Combustible: r.combustible_nombre ?? "",
        "Odómetro (km)": Number(r.odometro_km),
        "Recorrido (km)": r.distancia_km != null ? Number(r.distancia_km) : "",
        Litros: Number(r.litros),
        "Precio/L": r.precio_litro != null ? Number(r.precio_litro) : "",
        "Costo total": r.costo_total != null ? Number(r.costo_total) : "",
        "L/100km": r.litros_por_100km != null ? Number(r.litros_por_100km) : "",
        "Tanque lleno": r.tanque_lleno ? "Sí" : "No",
        Estación: r.estacion ?? "",
        Emblema: r.emblema ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      ws["!cols"] = [
        { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
        { wch: 13 }, { wch: 13 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
        { wch: 9 }, { wch: 11 }, { wch: 16 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cargas");
      const hoy = hoyLocal();
      XLSX.writeFile(wb, `sibarys-cargas-${hoy}.xlsx`);
      setInfo({ tipo: "ok", msg: `${cargas.length} carga(s) exportada(s).` });
    } catch (e: any) {
      setInfo({ tipo: "err", msg: "No se pudo exportar: " + (e?.message || e) });
    } finally {
      setCargando(false);
    }
  }

  function limpiar() {
    setChoferId("");
    setVehiculoId("");
    setEmblemaId("");
    setDesde("");
    setHasta("");
    setInfo(null);
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm text-slate-500">
        Elegí los filtros (o dejalos vacíos para exportar todo) y el formato.
      </p>

      <div className="space-y-3">
        <div>
          <label className="label">Chofer</label>
          <Combobox
            options={choferes}
            value={choferId}
            onChange={setChoferId}
            placeholder="Todos — escribí para buscar…"
          />
        </div>
        <div>
          <label className="label">Vehículo</label>
          <Combobox
            options={vehiculos}
            value={vehiculoId}
            onChange={setVehiculoId}
            placeholder="Todos — escribí para buscar…"
          />
        </div>
        <div>
          <label className="label">Emblema</label>
          <Combobox
            options={emblemas}
            value={emblemaId}
            onChange={setEmblemaId}
            placeholder="Todos — escribí para buscar…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="field"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="field"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Formato</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["excel", "Excel", "Archivo .xlsx"],
              ["pdf", "PDF", "Ver e imprimir"],
            ] as const
          ).map(([valor, titulo, sub]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFormato(valor)}
              className={`rounded-xl border px-3 py-2 text-left ${
                formato === valor
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-700">
                {titulo}
              </span>
              <span className="block text-xs text-slate-500">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {info ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            info.tipo === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : info.tipo === "vacio"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {info.msg}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={limpiar}>
          Limpiar filtros
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={formato === "excel" ? descargar : abrirPdf}
          disabled={cargando}
        >
          {cargando
            ? "Generando…"
            : formato === "excel"
              ? "⬇ Descargar Excel"
              : "🖨 Ver e imprimir PDF"}
        </button>
      </div>
    </div>
  );
}
