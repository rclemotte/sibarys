import { fmtDateTime, fmtNumber } from "@/lib/format";
import type { EstadoKm, KmAlquilado } from "@/lib/kmAlquilados";

const fmtYmd = (ymd: string) => ymd.split("-").reverse().join("/");

const ESTADOS: Record<EstadoKm, { texto: string; clase: string; barra: string }> = {
  excedido: { texto: "Se pasó del límite", clase: "bg-error-suave text-error", barra: "bg-error" },
  aviso: { texto: "Cerca del límite", clase: "bg-alerta-suave text-alerta", barra: "bg-alerta" },
  ok: { texto: "En regla", clase: "bg-ok-suave text-ok", barra: "bg-ok" },
  sin_datos: { texto: "Sin cargas desde la fecha", clase: "bg-neutro-suave text-suave", barra: "bg-linea" },
  sin_configurar: { texto: "Sin control", clase: "bg-neutro-suave text-suave", barra: "bg-linea" },
};

export const ORDEN: EstadoKm[] = ["excedido", "aviso", "ok", "sin_datos", "sin_configurar"];

export default function FilaKm({ v }: { v: KmAlquilado }) {
  const e = ESTADOS[v.estado];
  const pct = v.recorridos != null ? Math.min(100, (v.recorridos / v.limite) * 100) : 0;
  return (
    <li className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-extrabold">{v.nombre}</p>
          <p className="text-xs text-suave">
            {v.patente}
            {v.empresa ? ` · ${v.empresa}` : ""}
          </p>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>
          {e.texto}
        </span>
      </div>

      {v.estado === "sin_configurar" ? (
        <p className="text-xs text-suave">
          No tiene fecha de control. Cargala en Administración → Vehículos → Editar datos.
        </p>
      ) : (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutro-suave">
            <div className={`h-full rounded-full ${e.barra}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] uppercase text-tenue">Recorridos</p>
              <p className="font-bold tabular-nums">{v.recorridos != null ? fmtNumber(v.recorridos) : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-tenue">Límite</p>
              <p className="font-bold tabular-nums">{fmtNumber(v.limite)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-tenue">
                {v.restantes != null && v.restantes < 0 ? "Excedido" : "Restan"}
              </p>
              <p
                className={`font-bold tabular-nums ${
                  v.estado === "excedido" ? "text-error" : v.estado === "aviso" ? "text-alerta" : ""
                }`}
              >
                {v.restantes != null ? fmtNumber(Math.abs(v.restantes)) : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-suave">
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

