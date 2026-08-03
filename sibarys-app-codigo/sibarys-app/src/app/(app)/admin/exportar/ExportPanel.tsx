"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import type { Consumo } from "@/lib/types";
import Combobox from "@/components/Combobox";

type Opt = { id: string; nombre: string };

export default function ExportPanel({
  choferes,
  vehiculos,
}: {
  choferes: Opt[];
  vehiculos: Opt[];
}) {
  const [choferId, setChoferId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [info, setInfo] = useState<{ tipo: "ok" | "err" | "vacio"; msg: string } | null>(null);

  async function consultar(): Promise<Consumo[]> {
    const supabase = createClient();
    let q = supabase
      .from("consumo")
      .select("*")
      .order("registrado_en", { ascending: false });
    if (choferId) q = q.eq("chofer_id", choferId);
    if (vehiculoId) q = q.eq("vehiculo_id", vehiculoId);
    if (desde) q = q.gte("registrado_en", new Date(desde + "T00:00:00").toISOString());
    if (hasta) q = q.lte("registrado_en", new Date(hasta + "T23:59:59").toISOString());
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Consumo[];
  }

  async function descargar() {
    setCargando(true);
    setInfo(null);
    try {
      const cargas = await consultar();
      if (cargas.length === 0) {
        setInfo({ tipo: "vacio", msg: "No hay cargas para esos filtros." });
        return;
      }
      const filas = cargas.map((r) => ({
        Fecha: new Date(r.registrado_en).toLocaleString("es-AR"),
        Vehículo: r.vehiculo_nombre,
        Patente: r.patente,
        Chofer: r.chofer_nombre ?? "",
        Combustible: r.combustible_nombre ?? "",
        "Odómetro (km)": Number(r.odometro_km),
        "Recorrido (km)": r.distancia_km != null ? Number(r.distancia_km) : "",
        Litros: Number(r.litros),
        "Precio/L": r.precio_litro != null ? Number(r.precio_litro) : "",
        "Costo total": r.costo_total != null ? Number(r.costo_total) : "",
        "km/l": r.km_por_litro != null ? Number(r.km_por_litro) : "",
        "L/100km": r.litros_por_100km != null ? Number(r.litros_por_100km) : "",
        "Tanque lleno": r.tanque_lleno ? "Sí" : "No",
        Estación: r.estacion ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      ws["!cols"] = [
        { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
        { wch: 13 }, { wch: 13 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
        { wch: 8 }, { wch: 9 }, { wch: 11 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cargas");
      const hoy = new Date().toISOString().slice(0, 10);
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
    setDesde("");
    setHasta("");
    setInfo(null);
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm text-slate-500">
        Elegí los filtros (o dejalos vacíos para exportar todo) y descargá el
        Excel.
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
          onClick={descargar}
          disabled={cargando}
        >
          {cargando ? "Generando…" : "⬇ Descargar Excel"}
        </button>
      </div>
    </div>
  );
}
