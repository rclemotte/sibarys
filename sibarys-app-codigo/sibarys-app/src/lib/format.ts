// Zona horaria de la app: Paraguay (UTC-3). El servidor corre en UTC, así que
// todas las fechas se formatean explícitamente en esta zona.
export const ZONA_HORARIA = "America/Asuncion";

/** Partes de una fecha (año, mes, día, hora, minuto) en hora de Paraguay. */
function partesLocales(d: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    hh: get("hour"),
    mm: get("minute"),
  };
}

/** Diferencia con UTC en minutos para esa fecha (ej. -180 en Paraguay). */
function offsetMinutos(d: Date): number {
  const txt =
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA_HORARIA,
      timeZoneName: "shortOffset",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const m = txt.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return -180;
  const signo = m[1] === "-" ? -1 : 1;
  return signo * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/** "YYYY-MM-DD" de hoy en hora de Paraguay. */
export function hoyLocal(d: Date = new Date()): string {
  const p = partesLocales(d);
  return `${p.y}-${p.m}-${p.d}`;
}

/** "YYYY-MM-DDTHH:mm" en hora de Paraguay (para inputs datetime-local). */
export function fechaHoraLocalInput(d: Date = new Date()): string {
  const p = partesLocales(d);
  return `${p.y}-${p.m}-${p.d}T${p.hh}:${p.mm}`;
}

/** Instante real (Date) de las 00:00 en Paraguay de una fecha "YYYY-MM-DD". */
export function inicioDelDiaLocal(ymd: string = hoyLocal()): Date {
  const utcMedianoche = new Date(`${ymd}T00:00:00Z`);
  return new Date(utcMedianoche.getTime() - offsetMinutos(utcMedianoche) * 60000);
}

/** 00:00 en Paraguay del primer día del mes actual. */
export function inicioDelMesLocal(): Date {
  return inicioDelDiaLocal(hoyLocal().slice(0, 8) + "01");
}

export function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
