// "Planilla de combustible": el Excel con el formato que usa Dirección.
// Arma, para un rango de fechas:
//  - una hoja por grupo de vehículos (modelo; los alquilados aparte) con un
//    bloque por móvil: cada carga, km recorridos, consumo e importe por emblema
//  - Resumen: una fila por móvil con km, litros, guaraníes y consumo
//  - Por combustible: litros y monto por tipo de combustible, día por día
//  - Acumulado: litros y guaraníes por móvil, mes por mes, en el año
//
// Se genera en el navegador con exceljs (para tener colores, bordes y fórmulas).

import type ExcelJS from "exceljs";
import { fmtDateTime, hoyLocal } from "@/lib/format";
import type { FilaExport } from "@/lib/exportCargas";

export type VehiculoPlanilla = {
  id: string;
  nombre: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  es_alquilado: boolean;
  empresa: string | null;
  ref_l100: number | null;
  activo: boolean;
};

const ROJO = "FFA3222A";
const OSCURO = "FF2B2627";
const GRIS = "FFF1ECE1";
const BORDE = "FFD6CEC4";
const SUBTOTAL = "FFF6E4E2";

const F_KM = "#,##0";
const F_GS = "#,##0";
const F_LTS = "#,##0.00";
const F_CONS = "0.0";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Letra de columna de Excel (1 → A, 27 → AA). */
function col(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const ddmmaaaa = (ymd: string) => ymd.split("-").reverse().join("/");

/** Grupo (hoja) de un vehículo: su modelo; los alquilados van juntos. */
export function grupoDe(v: VehiculoPlanilla): string {
  if (v.es_alquilado) return "Alquilados";
  const m = [v.marca, v.modelo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return m ? m.toUpperCase() : "SIN MODELO";
}

/** Nombre de hoja válido para Excel (sin caracteres prohibidos, ≤ 31). */
function nombreHoja(nombre: string, usados: Set<string>): string {
  let base = nombre.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 28) || "Hoja";
  let n = base;
  let i = 2;
  while (usados.has(n.toLowerCase())) n = `${base.slice(0, 26)} ${i++}`;
  usados.add(n.toLowerCase());
  return n;
}

function pintar(
  c: ExcelJS.Cell,
  opts: { fondo?: string; color?: string; negrita?: boolean; fmt?: string; centro?: boolean },
) {
  if (opts.fondo) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fondo } };
  if (opts.color || opts.negrita)
    c.font = { bold: !!opts.negrita, color: opts.color ? { argb: opts.color } : undefined };
  if (opts.fmt) c.numFmt = opts.fmt;
  if (opts.centro) c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  c.border = {
    top: { style: "thin", color: { argb: BORDE } },
    left: { style: "thin", color: { argb: BORDE } },
    bottom: { style: "thin", color: { argb: BORDE } },
    right: { style: "thin", color: { argb: BORDE } },
  };
}

function titulo(ws: ExcelJS.Worksheet, texto: string, sub: string, ancho: number) {
  ws.getCell(1, 1).value = texto;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: ROJO } };
  ws.getCell(2, 1).value = sub;
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: "FF6E6462" } };
  if (ancho > 1) ws.mergeCells(1, 1, 1, Math.min(ancho, 12));
}

type Totales = { km: number; litros: number; litrosTramo: number; gasto: number; cargas: number };
const vacio = (): Totales => ({ km: 0, litros: 0, litrosTramo: 0, gasto: 0, cargas: 0 });
function sumar(t: Totales, r: FilaExport) {
  const l = Number(r.litros) || 0;
  const d = r.distancia_km != null ? Number(r.distancia_km) : 0;
  t.litros += l;
  t.gasto += Number(r.costo_total) || 0;
  t.cargas += 1;
  if (d > 0) {
    t.km += d;
    t.litrosTramo += l;
  }
}
const consumo = (t: Totales) => (t.km > 0 ? (t.litrosTramo / t.km) * 100 : null);

export function construirPlanilla(
  Excel: typeof ExcelJS,
  datos: {
    desde: string;
    hasta: string;
    cargas: FilaExport[]; // cargas del rango
    cargasAnio: FilaExport[]; // del 1/1 del año de "hasta" hasta "hasta"
    vehiculos: VehiculoPlanilla[];
  },
): ExcelJS.Workbook {
  const { desde, hasta, cargas, cargasAnio, vehiculos } = datos;
  const wb = new Excel.Workbook();
  wb.creator = "Sibarys";
  wb.calcProperties.fullCalcOnLoad = true;
  const usados = new Set<string>();
  const periodo = `Período: ${ddmmaaaa(desde)} al ${ddmmaaaa(hasta)}`;
  const generado = `Generado el ${fmtDateTime(new Date().toISOString())}`;

  const vehPorId = new Map(vehiculos.map((v) => [v.id, v]));
  const ordenar = (a: FilaExport, b: FilaExport) =>
    a.registrado_en.localeCompare(b.registrado_en) || Number(a.odometro_km) - Number(b.odometro_km);

  // Cargas del rango por vehículo, en orden cronológico
  const porVeh = new Map<string, FilaExport[]>();
  for (const r of [...cargas].sort(ordenar)) {
    const l = porVeh.get(r.vehiculo_id) || [];
    l.push(r);
    porVeh.set(r.vehiculo_id, l);
  }

  // Vehículos que aparecen: activos + cualquiera con cargas en el año
  const conCargas = new Set([...cargas, ...cargasAnio].map((r) => r.vehiculo_id));
  const listado = vehiculos
    .filter((v) => v.activo || conCargas.has(v.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
  const grupos = new Map<string, VehiculoPlanilla[]>();
  for (const v of listado) {
    const g = grupoDe(v);
    grupos.set(g, [...(grupos.get(g) || []), v]);
  }
  const nombresGrupos = Array.from(grupos.keys()).sort((a, b) =>
    a === "Alquilados" ? 1 : b === "Alquilados" ? -1 : a.localeCompare(b, "es"),
  );

  // ------------------------------------------------- una hoja por grupo
  for (const g of nombresGrupos) {
    const vs = (grupos.get(g) || []).filter((v) => (porVeh.get(v.id) || []).length > 0);
    if (vs.length === 0) continue;
    const ws = wb.addWorksheet(nombreHoja(g, usados), {
      views: [{ state: "frozen", ySplit: 5 }],
    });
    titulo(ws, `Control de consumo de combustible — ${g}`, `${periodo} · ${generado}`, 12);

    let c0 = 1; // primera columna del bloque
    for (const v of vs) {
      const filas = porVeh.get(v.id) || [];
      const emblemas = Array.from(new Set(filas.map((r) => r.emblema || "Sin emblema"))).sort();
      const cab = ["FECHA", "LUGAR", "CHOFER", "KM", "LTS", "KM REC.", "CONS. L/100", ...emblemas.map((e) => e.toUpperCase()), "TOTAL ₲"];
      const ancho = cab.length;
      const C = (i: number) => c0 + i; // columna i del bloque (0 = FECHA)
      const cKm = C(3), cLts = C(4), cRec = C(5), cCons = C(6), cEmb0 = C(7), cTot = C(7 + emblemas.length);

      // Título del bloque
      ws.mergeCells(4, c0, 4, c0 + ancho - 1);
      const t = ws.getCell(4, c0);
      t.value = `MÓVIL ${v.nombre} · ${v.patente}${v.empresa ? ` · ${v.empresa}` : ""}`;
      pintar(t, { fondo: ROJO, color: "FFFFFFFF", negrita: true, centro: true });
      cab.forEach((h, i) => {
        const c = ws.getCell(5, C(i));
        c.value = h;
        pintar(c, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
      });

      // Km de la carga anterior al período (punto de partida)
      const ini = ws.getCell(6, C(1));
      ini.value = "Km anterior";
      pintar(ini, { fondo: GRIS });
      const kmIni = ws.getCell(6, cKm);
      const anterior = Number(filas[0]?.odometro_anterior);
      kmIni.value = filas[0]?.odometro_anterior != null && Number.isFinite(anterior) ? anterior : null;
      pintar(kmIni, { fondo: GRIS, fmt: F_KM });
      for (let i = 0; i < ancho; i++) if (![1, 3].includes(i)) pintar(ws.getCell(6, C(i)), { fondo: GRIS });

      let fila = 7;
      for (const r of filas) {
        const d = new Date(r.registrado_en);
        const fecha = new Date(Date.UTC(Number(hoyLocal(d).slice(0, 4)), Number(hoyLocal(d).slice(5, 7)) - 1, Number(hoyLocal(d).slice(8, 10))));
        const valores: [number, any, string?][] = [
          [C(0), fecha, "dd/mm/yyyy"],
          [C(1), r.estacion ?? ""],
          [C(2), r.chofer_nombre ?? ""],
          [cKm, Number(r.odometro_km), F_KM],
          [cLts, Number(r.litros), F_LTS],
          [cRec, r.distancia_km != null && Number(r.distancia_km) > 0 ? Number(r.distancia_km) : null, F_KM],
        ];
        for (const [c, val, fmt] of valores) {
          const cell = ws.getCell(fila, c);
          cell.value = val;
          pintar(cell, { fmt });
        }
        const lts = Number(r.litros), rec = Number(r.distancia_km) || 0;
        const cons = ws.getCell(fila, cCons);
        cons.value = {
          formula: `IF(N(${col(cRec)}${fila})>0,${col(cLts)}${fila}/${col(cRec)}${fila}*100,"")`,
          result: rec > 0 ? (lts / rec) * 100 : "",
        } as any;
        pintar(cons, { fmt: F_CONS });
        emblemas.forEach((e, i) => {
          const cell = ws.getCell(fila, cEmb0 + i);
          cell.value = (r.emblema || "Sin emblema") === e ? Number(r.costo_total) || 0 : null;
          pintar(cell, { fmt: F_GS });
        });
        const tot = ws.getCell(fila, cTot);
        tot.value = {
          formula: `SUM(${col(cEmb0)}${fila}:${col(cTot - 1)}${fila})`,
          result: Number(r.costo_total) || 0,
        } as any;
        pintar(tot, { fmt: F_GS, negrita: true });
        fila++;
      }

      // Totales del móvil
      const tt = vacio();
      filas.forEach((r) => sumar(tt, r));
      const r1 = 7, r2 = fila - 1;
      const sum = (c: number) => `SUM(${col(c)}${r1}:${col(c)}${r2})`;
      const tf = fila;
      const lab = ws.getCell(tf, C(0));
      lab.value = "TOTAL";
      ws.mergeCells(tf, C(0), tf, C(2));
      pintar(lab, { fondo: SUBTOTAL, negrita: true });
      pintar(ws.getCell(tf, cKm), { fondo: SUBTOTAL });
      const totCells: [number, any, string][] = [
        [cLts, { formula: sum(cLts), result: tt.litros }, F_LTS],
        [cRec, { formula: sum(cRec), result: tt.km }, F_KM],
        [
          cCons,
          {
            formula: `IF(${sum(cRec)}>0,SUMIFS(${col(cLts)}${r1}:${col(cLts)}${r2},${col(cRec)}${r1}:${col(cRec)}${r2},">0")/${sum(cRec)}*100,"")`,
            result: consumo(tt) ?? "",
          },
          F_CONS,
        ],
      ];
      emblemas.forEach((_, i) => {
        const c = cEmb0 + i;
        const res = filas.filter((r) => (r.emblema || "Sin emblema") === emblemas[i]).reduce((s, r) => s + (Number(r.costo_total) || 0), 0);
        totCells.push([c, { formula: sum(c), result: res }, F_GS]);
      });
      totCells.push([cTot, { formula: sum(cTot), result: tt.gasto }, F_GS]);
      for (const [c, val, fmt] of totCells) {
        const cell = ws.getCell(tf, c);
        cell.value = val;
        pintar(cell, { fondo: SUBTOTAL, negrita: true, fmt });
      }

      // Anchos
      const anchos = [11, 22, 18, 10, 9, 9, 9, ...emblemas.map(() => 12), 13];
      anchos.forEach((w, i) => (ws.getColumn(C(i)).width = w));
      ws.getColumn(c0 + ancho).width = 3; // separación entre bloques
      c0 += ancho + 1;
    }
  }

  // ------------------------------------------------- Resumen
  {
    const ws = wb.addWorksheet(nombreHoja("Resumen", usados), {
      views: [{ state: "frozen", ySplit: 4 }],
    });
    titulo(ws, "Resumen por móvil", `${periodo} · ${generado}`, 11);
    const cab = ["Grupo", "Móvil", "Patente", "Marca / modelo", "Combustible", "Cargas", "Km recorridos", "Litros", "Guaraníes", "Consumo L/100 km", "Referencia L/100 km"];
    cab.forEach((h, i) => {
      const c = ws.getCell(4, i + 1);
      c.value = h;
      pintar(c, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
    });
    let fila = 5;
    const subtotales: number[] = [];
    const general = vacio();
    for (const g of nombresGrupos) {
      const vs = grupos.get(g) || [];
      const ini = fila;
      const tg = vacio();
      for (const v of vs) {
        const fs = porVeh.get(v.id) || [];
        const t = vacio();
        fs.forEach((r) => sumar(t, r));
        fs.forEach((r) => sumar(tg, r));
        const combs = new Map<string, number>();
        fs.forEach((r) => {
          const k = r.combustible_nombre || "—";
          combs.set(k, (combs.get(k) || 0) + Number(r.litros));
        });
        const comb = Array.from(combs.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
        const vals: [any, string?][] = [
          [fila === ini ? g : ""],
          [v.nombre],
          [v.patente],
          [[v.marca, v.modelo].filter(Boolean).join(" ")],
          [comb],
          [t.cargas, F_KM],
          [t.km, F_KM],
          [t.litros, F_LTS],
          [t.gasto, F_GS],
          [consumo(t), F_CONS],
          [v.ref_l100, F_CONS],
        ];
        vals.forEach(([val, fmt], i) => {
          const c = ws.getCell(fila, i + 1);
          c.value = val ?? null;
          pintar(c, { fmt, negrita: i === 0 });
        });
        fila++;
      }
      // Subtotal del grupo
      const fin = fila - 1;
      const lab = ws.getCell(fila, 1);
      lab.value = `Total ${g}`;
      ws.mergeCells(fila, 1, fila, 5);
      pintar(lab, { fondo: SUBTOTAL, negrita: true });
      const s = (c: number) => `SUM(${col(c)}${ini}:${col(c)}${fin})`;
      const sub: [number, any, string][] = [
        [6, { formula: s(6), result: tg.cargas }, F_KM],
        [7, { formula: s(7), result: tg.km }, F_KM],
        [8, { formula: s(8), result: tg.litros }, F_LTS],
        [9, { formula: s(9), result: tg.gasto }, F_GS],
        [10, consumo(tg), F_CONS],
      ];
      for (const [c, val, fmt] of sub) {
        const cell = ws.getCell(fila, c);
        cell.value = val;
        pintar(cell, { fondo: SUBTOTAL, negrita: true, fmt });
      }
      pintar(ws.getCell(fila, 11), { fondo: SUBTOTAL });
      subtotales.push(fila);
      general.km += tg.km; general.litros += tg.litros; general.litrosTramo += tg.litrosTramo; general.gasto += tg.gasto; general.cargas += tg.cargas;
      fila += 2;
    }
    const lab = ws.getCell(fila, 1);
    lab.value = "TOTAL GENERAL";
    ws.mergeCells(fila, 1, fila, 5);
    pintar(lab, { fondo: OSCURO, color: "FFFFFFFF", negrita: true });
    const tot = (c: number) => subtotales.map((f) => `${col(c)}${f}`).join("+") || "0";
    const gen: [number, any, string][] = [
      [6, { formula: tot(6), result: general.cargas }, F_KM],
      [7, { formula: tot(7), result: general.km }, F_KM],
      [8, { formula: tot(8), result: general.litros }, F_LTS],
      [9, { formula: tot(9), result: general.gasto }, F_GS],
      [10, consumo(general), F_CONS],
    ];
    for (const [c, val, fmt] of gen) {
      const cell = ws.getCell(fila, c);
      cell.value = val;
      pintar(cell, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, fmt });
    }
    pintar(ws.getCell(fila, 11), { fondo: OSCURO });
    [18, 14, 11, 20, 16, 9, 13, 12, 15, 12, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  }

  // ------------------------------------------------- Por combustible, día por día
  {
    const ws = wb.addWorksheet(nombreHoja("Por combustible", usados), {
      views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
    });
    titulo(ws, "Litros y monto por tipo de combustible", `${periodo} · ${generado}`, 8);
    const dias: string[] = [];
    for (let d = new Date(`${desde}T12:00:00Z`); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1))
      dias.push(d.toISOString().slice(0, 10));
    const tipos = Array.from(new Set(cargas.map((r) => r.combustible_nombre || "Sin combustible"))).sort();
    const datosDia = new Map<string, { l: number; m: number }>();
    for (const r of cargas) {
      const k = `${r.combustible_nombre || "Sin combustible"}|${hoyLocal(new Date(r.registrado_en))}`;
      const x = datosDia.get(k) || { l: 0, m: 0 };
      x.l += Number(r.litros) || 0;
      x.m += Number(r.costo_total) || 0;
      datosDia.set(k, x);
    }
    const h = ws.getCell(4, 1);
    h.value = "Tipo";
    ws.mergeCells(4, 1, 5, 1);
    pintar(h, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
    const bloques = [...dias.map((d) => ddmm(d)), "TOTAL"];
    bloques.forEach((b, i) => {
      const c = 2 + i * 2;
      ws.mergeCells(4, c, 4, c + 1);
      const cell = ws.getCell(4, c);
      cell.value = b;
      pintar(cell, { fondo: i === bloques.length - 1 ? ROJO : OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
      ["Litros", "Monto ₲"].forEach((t, j) => {
        const s = ws.getCell(5, c + j);
        s.value = t;
        pintar(s, { fondo: GRIS, negrita: true, centro: true });
      });
    });
    const cTotL = 2 + dias.length * 2;
    let fila = 6;
    for (const tipo of tipos) {
      const n = ws.getCell(fila, 1);
      n.value = tipo;
      pintar(n, { negrita: true });
      let tl = 0, tm = 0;
      dias.forEach((d, i) => {
        const x = datosDia.get(`${tipo}|${d}`);
        const cl = ws.getCell(fila, 2 + i * 2), cm = ws.getCell(fila, 3 + i * 2);
        cl.value = x ? x.l : null;
        cm.value = x ? x.m : null;
        pintar(cl, { fmt: F_LTS });
        pintar(cm, { fmt: F_GS });
        tl += x?.l ?? 0;
        tm += x?.m ?? 0;
      });
      const refsL = dias.map((_, i) => `${col(2 + i * 2)}${fila}`).join(",");
      const refsM = dias.map((_, i) => `${col(3 + i * 2)}${fila}`).join(",");
      const a = ws.getCell(fila, cTotL), b = ws.getCell(fila, cTotL + 1);
      a.value = { formula: `SUM(${refsL})`, result: tl } as any;
      b.value = { formula: `SUM(${refsM})`, result: tm } as any;
      pintar(a, { fmt: F_LTS, negrita: true, fondo: SUBTOTAL });
      pintar(b, { fmt: F_GS, negrita: true, fondo: SUBTOTAL });
      fila++;
    }
    // Totales por día
    const lab = ws.getCell(fila, 1);
    lab.value = "TOTAL";
    pintar(lab, { fondo: OSCURO, color: "FFFFFFFF", negrita: true });
    for (let c = 2; c <= cTotL + 1; c++) {
      const cell = ws.getCell(fila, c);
      const res = tipos.reduce((s, _, k) => s + (Number(ws.getCell(6 + k, c).result ?? ws.getCell(6 + k, c).value) || 0), 0);
      cell.value = { formula: tipos.length ? `SUM(${col(c)}6:${col(c)}${fila - 1})` : "0", result: res } as any;
      pintar(cell, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, fmt: c % 2 === 0 ? F_LTS : F_GS });
    }

    // Resumen por tipo: litros, monto y precio promedio
    fila += 3;
    ["Tipo", "Litros", "Monto ₲", "Precio promedio ₲/L"].forEach((t, i) => {
      const c = ws.getCell(fila, 1 + i);
      c.value = t;
      pintar(c, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
    });
    const r0 = fila + 1;
    tipos.forEach((tipo, k) => {
      const f = r0 + k;
      const src = 6 + k;
      const tl = Number(ws.getCell(src, cTotL).result) || 0;
      const tm = Number(ws.getCell(src, cTotL + 1).result) || 0;
      const vals: [any, string?][] = [
        [tipo],
        [{ formula: `${col(cTotL)}${src}`, result: tl }, F_LTS],
        [{ formula: `${col(cTotL + 1)}${src}`, result: tm }, F_GS],
        [{ formula: `IF(B${f}>0,C${f}/B${f},"")`, result: tl > 0 ? tm / tl : "" }, F_GS],
      ];
      vals.forEach(([v, fmt], i) => {
        const c = ws.getCell(f, 1 + i);
        c.value = v;
        pintar(c, { fmt, negrita: i === 0 });
      });
    });
    ws.getColumn(1).width = 20;
    for (let c = 2; c <= cTotL + 1; c++) ws.getColumn(c).width = c % 2 === 0 ? 9 : 12;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 13;
    ws.getColumn(4).width = 13;
  }

  // ------------------------------------------------- Acumulado por mes
  {
    const anio = hasta.slice(0, 4);
    const mesFin = Number(hasta.slice(5, 7));
    const ws = wb.addWorksheet(nombreHoja("Acumulado", usados), {
      views: [{ state: "frozen", xSplit: 3, ySplit: 5 }],
    });
    titulo(
      ws,
      `Acumulado ${anio}: litros y guaraníes por mes`,
      `Enero a ${MESES[mesFin - 1]} ${anio}, hasta el ${ddmmaaaa(hasta)} · ${generado}`,
      10,
    );
    const porVehMes = new Map<string, { l: number; g: number }>();
    for (const r of cargasAnio) {
      const ymd = hoyLocal(new Date(r.registrado_en));
      if (ymd.slice(0, 4) !== anio) continue;
      const k = `${r.vehiculo_id}|${Number(ymd.slice(5, 7))}`;
      const x = porVehMes.get(k) || { l: 0, g: 0 };
      x.l += Number(r.litros) || 0;
      x.g += Number(r.costo_total) || 0;
      porVehMes.set(k, x);
    }
    ["Grupo", "Móvil", "Patente"].forEach((t, i) => {
      const c = ws.getCell(4, i + 1);
      c.value = t;
      ws.mergeCells(4, i + 1, 5, i + 1);
      pintar(c, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
    });
    const meses = Array.from({ length: mesFin }, (_, i) => i + 1);
    const bloques = [...meses.map((m) => MESES[m - 1].toUpperCase()), "TOTAL"];
    bloques.forEach((b, i) => {
      const c = 4 + i * 2;
      ws.mergeCells(4, c, 4, c + 1);
      const cell = ws.getCell(4, c);
      cell.value = b;
      pintar(cell, { fondo: i === bloques.length - 1 ? ROJO : OSCURO, color: "FFFFFFFF", negrita: true, centro: true });
      ["Litros", "Guaraníes"].forEach((t, j) => {
        const s = ws.getCell(5, c + j);
        s.value = t;
        pintar(s, { fondo: GRIS, negrita: true, centro: true });
      });
    });
    const cTot = 4 + meses.length * 2;
    let fila = 6;
    const subt: number[] = [];
    for (const g of nombresGrupos) {
      const vs = grupos.get(g) || [];
      const ini = fila;
      for (const v of vs) {
        const base: [any, boolean][] = [[fila === ini ? g : "", true], [v.nombre, false], [v.patente, false]];
        base.forEach(([val, b], i) => {
          const c = ws.getCell(fila, i + 1);
          c.value = val;
          pintar(c, { negrita: b });
        });
        let tl = 0, tg = 0;
        meses.forEach((m, i) => {
          const x = porVehMes.get(`${v.id}|${m}`);
          const cl = ws.getCell(fila, 4 + i * 2), cg = ws.getCell(fila, 5 + i * 2);
          cl.value = x ? Math.round(x.l * 100) / 100 : 0;
          cg.value = x ? x.g : 0;
          pintar(cl, { fmt: F_LTS });
          pintar(cg, { fmt: F_GS });
          tl += x?.l ?? 0;
          tg += x?.g ?? 0;
        });
        const a = ws.getCell(fila, cTot), b = ws.getCell(fila, cTot + 1);
        a.value = { formula: meses.map((_, i) => `${col(4 + i * 2)}${fila}`).join("+") || "0", result: tl } as any;
        b.value = { formula: meses.map((_, i) => `${col(5 + i * 2)}${fila}`).join("+") || "0", result: tg } as any;
        pintar(a, { fmt: F_LTS, negrita: true, fondo: SUBTOTAL });
        pintar(b, { fmt: F_GS, negrita: true, fondo: SUBTOTAL });
        fila++;
      }
      const fin = fila - 1;
      const lab = ws.getCell(fila, 1);
      lab.value = `Total ${g}`;
      ws.mergeCells(fila, 1, fila, 3);
      pintar(lab, { fondo: SUBTOTAL, negrita: true });
      for (let c = 4; c <= cTot + 1; c++) {
        const cell = ws.getCell(fila, c);
        let res = 0;
        for (let f = ini; f <= fin; f++) res += Number(ws.getCell(f, c).result ?? ws.getCell(f, c).value) || 0;
        cell.value = { formula: `SUM(${col(c)}${ini}:${col(c)}${fin})`, result: res } as any;
        pintar(cell, { fondo: SUBTOTAL, negrita: true, fmt: c % 2 === 0 ? F_LTS : F_GS });
      }
      subt.push(fila);
      fila += 2;
    }
    const lab = ws.getCell(fila, 1);
    lab.value = "TOTAL GENERAL";
    ws.mergeCells(fila, 1, fila, 3);
    pintar(lab, { fondo: OSCURO, color: "FFFFFFFF", negrita: true });
    for (let c = 4; c <= cTot + 1; c++) {
      const cell = ws.getCell(fila, c);
      const res = subt.reduce((s, f) => s + (Number(ws.getCell(f, c).result) || 0), 0);
      cell.value = { formula: subt.map((f) => `${col(c)}${f}`).join("+") || "0", result: res } as any;
      pintar(cell, { fondo: OSCURO, color: "FFFFFFFF", negrita: true, fmt: c % 2 === 0 ? F_LTS : F_GS });
    }
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 11;
    for (let c = 4; c <= cTot + 1; c++) ws.getColumn(c).width = c % 2 === 0 ? 10 : 13;
  }

  return wb;
}
