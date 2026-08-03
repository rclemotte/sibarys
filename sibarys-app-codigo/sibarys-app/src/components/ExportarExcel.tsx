"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import type { Consumo } from "@/lib/types";

export default function ExportarExcel() {
  const [cargando, setCargando] = useState(false);

  async function descargar() {
    setCargando(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("consumo")
        .select("*")
        .order("registrado_en", { ascending: false });

      if (error) {
        alert("No se pudo exportar: " + error.message);
        return;
      }
      const cargas = (data || []) as Consumo[];
      if (cargas.length === 0) {
        alert("No hay cargas para exportar.");
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
        "L/100km":
          r.litros_por_100km != null ? Number(r.litros_por_100km) : "",
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
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `sibarys-cargas-${fecha}.xlsx`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={descargar}
      disabled={cargando}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {cargando ? "Generando…" : "⬇ Descargar Excel"}
    </button>
  );
}
