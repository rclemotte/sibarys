"use client";

import * as XLSX from "xlsx";
import { fmtDateTime, hoyLocal } from "@/lib/format";
import type { KmAlquilado } from "@/lib/kmAlquilados";

const ESTADO: Record<KmAlquilado["estado"], string> = {
  excedido: "Se pasó del límite",
  aviso: "Cerca del límite",
  ok: "En regla",
  sin_datos: "Sin cargas desde la fecha",
  sin_configurar: "Sin control",
};

export default function DescargarKm({ filas }: { filas: KmAlquilado[] }) {
  function descargar() {
    const datos = filas.map((v) => ({
      Vehículo: v.nombre,
      Patente: v.patente,
      Empresa: v.empresa ?? "",
      "Controla desde": v.desde ? v.desde.split("-").reverse().join("/") : "",
      "Km al inicio": v.kmInicio ?? "",
      "Último odómetro": v.kmActual ?? "",
      "Última carga": v.ultimaCarga ? fmtDateTime(v.ultimaCarga) : "",
      "Km recorridos": v.recorridos ?? "",
      "Límite km": v.desde ? v.limite : "",
      "Km restantes": v.restantes ?? "",
      Estado: ESTADO[v.estado],
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Km alquilados");
    XLSX.writeFile(wb, `sibarys-km-alquilados-${hoyLocal()}.xlsx`);
  }
  return (
    <button type="button" className="btn-ghost w-full" onClick={descargar}>
      ⬇ Descargar en Excel
    </button>
  );
}
