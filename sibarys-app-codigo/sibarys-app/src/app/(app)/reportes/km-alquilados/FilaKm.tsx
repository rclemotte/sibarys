import { fmtDateTime, fmtNumber } from "@/lib/format";
import type { EstadoKm, KmAlquilado } from "@/lib/kmAlquilados";

const fmtYmd = (ymd: string) => ymd.split("-").reverse().join("/");

const ESTADOS: Record<EstadoKm, { texto: string; clase: string; barra: string }> = {
  excedido: { texto: "Se pasó del límite", clase: "bg-red-100 text-red-700", barra: "bg-red-500" },
  aviso: { texto: "Cerca del límite", clase: "bg-amber-100 text-amber-800", barra: "bg-amber-500" },
  ok: { texto: "En regla", clase: "bg-emerald-100 text-emerald-700", barra: "bg-emerald-500" },
  sin_datos: { texto: "Sin cargas desde la fecha", clase: "bg-slate-100 text-slate-600", barra: "bg-slate-300" },
  sin_configurar: { texto: "Sin control", clase: "bg-slate-100 text-slate-500", barra: "bg-slate-300" },
};

export const ORDEN: EstadoKm[] = ["excedido", "aviso", "ok", "sin_datos", "sin_configurar"];

export default function FilaKm({ v }: { v: KmAlquilado }) {
  const e = ESTADOS[v.estado];
  const pct = v.recorridos != null ? Math.min(100, (v.recorridos / v.limite) * 100) : 0;
  return (
    <li className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{v.nombre}</p>
          <p className="text-xs text-slate-500">
            {v.patente}
            {v.empresa ? ` · ${v.empresa}` : ""}
          </p>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>
          {e.texto}
        </span>
      </div>

      {v.estado === "sin_configurar" ? (
        <p className="text-xs text-slate-500">
          No tiene fecha de control. Cargala en Administración → Vehículos → Editar datos.
        </p>
      ) : (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${e.barra}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] uppercase text-slate-400">Recorridos</p>
              <p className="font-bold tabular-nums">{v.recorridos != null ? fmtNumber(v.recorridos) : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-400">Límite</p>
              <p className="font-bold tabular-nums">{fmtNumber(v.limite)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-400">
                {v.restantes != null && v.restantes < 0 ? "Excedido" : "Restan"}
              </p>
              <p
                className={`font-bold tabular-nums ${
                  v.estado === "excedido" ? "text-red-600" : v.estado === "aviso" ? "text-amber-700" : ""
                }`}
              >
                {v.restantes != null ? fmtNumber(Math.abs(v.restantes)) : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Desde {fmtYmd(v.desde!)} · km al inicio {v.kmInicio != null ? fmtNumber(v.kmInicio) : "—"}
            {v.origenInicio === "primera_carga" ? " (1ª carga desde esa fecha)" : ""} · último odómetro{" "}
            {v.kmActual != null ? `${fmtNumber(v.kmActual)} km` : "—"}
            {v.ultimaCarga ? ` (${fmtDateTime(v.ultimaCarga)})` : ""} · aviso a {fmtNumber(v.aviso)} km
          </p>
        </>
      )}
    </li>
  );
}

