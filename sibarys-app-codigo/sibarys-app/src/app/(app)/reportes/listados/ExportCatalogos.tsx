"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { fmtDate, hoyLocal } from "@/lib/format";
import { referenciaL100 } from "@/lib/consumo";
import { textoRol } from "@/lib/permisos";

type Fila = Record<string, string | number>;
type Supa = ReturnType<typeof createClient>;

const siNo = (b: boolean | null | undefined) => (b ? "Sí" : "No");
const estado = (activo: boolean | null | undefined) =>
  activo === false ? "Inactivo" : "Activo";

/** Arma las filas de cada catálogo. */
const CATALOGOS: {
  clave: string;
  titulo: string;
  hoja: string;
  filas: (s: Supa) => Promise<Fila[]>;
}[] = [
  {
    clave: "vehiculos",
    titulo: "Vehículos",
    hoja: "Vehiculos",
    filas: async (s) => {
      const [{ data: vs, error }, { data: emps }, { data: vc }] =
        await Promise.all([
          s.from("vehiculos").select("*").order("nombre"),
          s.from("empresas").select("id, nombre"),
          s
            .from("vehiculo_combustibles")
            .select("vehiculo_id, tipos_combustible(nombre)"),
        ]);
      if (error) throw error;
      const empresa = new Map(
        (emps || []).map((e: any) => [e.id as string, e.nombre as string])
      );
      const combus = new Map<string, string[]>();
      (vc || []).forEach((r: any) => {
        const n = r.tipos_combustible?.nombre;
        if (!n) return;
        combus.set(r.vehiculo_id, [...(combus.get(r.vehiculo_id) || []), n]);
      });
      return (vs || []).map((v: any) => ({
        Nombre: v.nombre ?? "",
        Patente: v.patente ?? "",
        Marca: v.marca ?? "",
        Modelo: v.modelo ?? "",
        Año: v.anio ?? "",
        "Tanque (L)":
          v.capacidad_tanque_litros != null
            ? Number(v.capacidad_tanque_litros)
            : "",
        "Consumo ref. (L/100 km)": referenciaL100(v) ?? "",
        Combustibles: (combus.get(v.id) || []).sort().join(", "),
        Alquilado: siNo(v.es_alquilado),
        "Empresa alquiler": v.empresa_id ? empresa.get(v.empresa_id) ?? "" : "",
        Estado: estado(v.activo),
      }));
    },
  },
  {
    clave: "estaciones",
    titulo: "Estaciones",
    hoja: "Estaciones",
    filas: async (s) => {
      const { data, error } = await s
        .from("estaciones_servicio")
        .select("nombre, localidad, activo, emblemas(nombre)")
        .order("nombre");
      if (error) throw error;
      return (data || []).map((e: any) => ({
        Nombre: e.nombre ?? "",
        Emblema: e.emblemas?.nombre ?? "",
        Localidad: e.localidad ?? "",
        Estado: estado(e.activo),
      }));
    },
  },
  {
    clave: "usuarios",
    titulo: "Choferes y usuarios",
    hoja: "Usuarios",
    filas: async (s) => {
      const { data, error } = await s
        .from("perfiles")
        .select("nombre_completo, cedula, rol, activo, creado_en")
        .order("nombre_completo");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        Nombre: p.nombre_completo ?? "",
        Cédula: p.cedula ?? "",
        Rol: textoRol(p.rol),
        Estado: estado(p.activo),
        "Creado el": fmtDate(p.creado_en),
      }));
    },
  },
  {
    clave: "empresas",
    titulo: "Empresas",
    hoja: "Empresas",
    filas: async (s) => simple(s, "empresas"),
  },
  {
    clave: "emblemas",
    titulo: "Emblemas",
    hoja: "Emblemas",
    filas: async (s) => simple(s, "emblemas"),
  },
  {
    clave: "marcas",
    titulo: "Marcas",
    hoja: "Marcas",
    filas: async (s) => simple(s, "marcas"),
  },
  {
    clave: "combustibles",
    titulo: "Combustibles",
    hoja: "Combustibles",
    filas: async (s) => {
      const { data, error } = await s
        .from("tipos_combustible")
        .select("nombre, octanaje, activo")
        .order("nombre");
      if (error) throw error;
      return (data || []).map((c: any) => ({
        Nombre: c.nombre ?? "",
        Octanaje: c.octanaje ?? "",
        Estado: estado(c.activo),
      }));
    },
  },
];

/** Catálogos que solo tienen nombre y estado. */
async function simple(s: Supa, tabla: string): Promise<Fila[]> {
  const { data, error } = await s
    .from(tabla)
    .select("nombre, activo")
    .order("nombre");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    Nombre: r.nombre ?? "",
    Estado: estado(r.activo),
  }));
}

/** Hoja con columnas de ancho razonable según el contenido. */
function hojaDe(filas: Fila[]) {
  const ws = XLSX.utils.json_to_sheet(filas);
  const cols = Object.keys(filas[0] || {});
  ws["!cols"] = cols.map((c) => ({
    wch: Math.min(
      40,
      Math.max(c.length, ...filas.map((f) => String(f[c] ?? "").length)) + 2
    ),
  }));
  return ws;
}

export default function ExportCatalogos() {
  const [cargando, setCargando] = useState<string | null>(null);
  const [info, setInfo] = useState<{ ok: boolean; msg: string } | null>(null);

  async function exportar(claves: string[], archivo: string) {
    setCargando(claves.length > 1 ? "todo" : claves[0]);
    setInfo(null);
    try {
      const supabase = createClient();
      const wb = XLSX.utils.book_new();
      let total = 0;
      for (const cat of CATALOGOS.filter((c) => claves.includes(c.clave))) {
        const filas = await cat.filas(supabase);
        total += filas.length;
        XLSX.utils.book_append_sheet(
          wb,
          filas.length > 0
            ? hojaDe(filas)
            : XLSX.utils.json_to_sheet([{ Nombre: "(sin datos)" }]),
          cat.hoja
        );
      }
      XLSX.writeFile(wb, `sibarys-${archivo}-${hoyLocal()}.xlsx`);
      setInfo({ ok: true, msg: `${total} registro(s) exportado(s).` });
    } catch (e: any) {
      setInfo({
        ok: false,
        msg: "No se pudo exportar: " + (e?.message || String(e)),
      });
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {CATALOGOS.map((c) => (
          <button
            key={c.clave}
            type="button"
            className="btn-ghost text-sm"
            disabled={cargando !== null}
            onClick={() => exportar([c.clave], c.clave)}
          >
            {cargando === c.clave ? "Generando…" : `⬇ ${c.titulo}`}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary w-full"
        disabled={cargando !== null}
        onClick={() =>
          exportar(
            CATALOGOS.map((c) => c.clave),
            "catalogos"
          )
        }
      >
        {cargando === "todo"
          ? "Generando…"
          : "⬇ Todo en un archivo (una hoja por catálogo)"}
      </button>

      {info ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            info.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {info.msg}
        </p>
      ) : null}
    </div>
  );
}
