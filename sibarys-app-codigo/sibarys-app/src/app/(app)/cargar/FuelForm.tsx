"use client";

import { fechaHoraLocalInput } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearCarga, type CargarState } from "./actions";
import type { VehiculoParaCarga, EstacionParaCarga } from "@/lib/types";
import Combobox from "@/components/Combobox";
import ComprobanteCompartir from "./ComprobanteCompartir";
import Seccion from "@/components/ui/Seccion";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardPen,
  Fuel,
  Gauge,
  House,
  MapPin,
  Plus,
  Truck,
} from "lucide-react";

/** Opción especial del buscador: la estación no está en la lista. */
const OTRA = "__otra__";

// Muestra un número entero con separadores de miles (ej. 250000 -> "250.000")
function fmtMiles(raw: string): string {
  if (!raw) return "";
  return Number(raw).toLocaleString("es-AR");
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+104px)] z-20 lg:static lg:inset-auto">
      <button type="submit" className="btn-primary w-full text-lg shadow-flotante lg:shadow-boton" disabled={pending}>
        <CheckCircle2 size={22} strokeWidth={2.6} />
        {pending ? "Guardando…" : "Guardar carga"}
      </button>
    </div>
  );
}

export default function FuelForm({
  vehiculos,
  estaciones,
  emblemas,
  choferes,
}: {
  vehiculos: VehiculoParaCarga[];
  estaciones: EstacionParaCarga[];
  emblemas: { id: string; nombre: string }[];
  /** Solo para administración: permite registrar cargas olvidadas. */
  choferes?: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useFormState<CargarState, FormData>(crearCarga, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Evita doble envío: un doble toque rápido en el celular puede mandar el
  // formulario dos veces antes de que el botón llegue a bloquearse.
  const enviando = useRef(false);
  useEffect(() => {
    enviando.current = false; // llegó la respuesta del servidor
  }, [state]);

  const [vehiculoId, setVehiculoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [odometro, setOdometro] = useState(""); // solo dígitos
  const [litros, setLitros] = useState("");
  const [total, setTotal] = useState(""); // solo dígitos
  const [estacionId, setEstacionId] = useState("");
  const [faltaEstacion, setFaltaEstacion] = useState(false);
  const esOtra = estacionId === OTRA;
  const [olvidada, setOlvidada] = useState(false);
  const [choferId, setChoferId] = useState("");
  const [fecha, setFecha] = useState("");
  const [tanqueLleno, setTanqueLleno] = useState(false);
  // Pantalla de éxito después de guardar (con el comprobante)
  const [exito, setExito] = useState(false);

  const vehiculo = useMemo(
    () => vehiculos.find((v) => v.id === vehiculoId),
    [vehiculos, vehiculoId]
  );
  const combustibles = vehiculo?.combustibles ?? [];

  // Precio por litro = total ÷ litros (se calcula solo)
  const precioLitro = useMemo(() => {
    const l = Number(litros);
    const t = Number(total);
    if (l > 0 && t > 0) return t / l;
    return null;
  }, [litros, total]);

  // Opciones del buscador de estación (memorizadas para no reiniciar el texto)
  const opcionesEstaciones = useMemo(
    () => [
      ...estaciones.map((e) => ({
        id: e.id,
        nombre: `${e.nombre}${
          e.emblema_nombre ? ` — ${e.emblema_nombre}` : ""
        }${e.localidad ? ` (${e.localidad})` : ""}`,
      })),
      { id: OTRA, nombre: "➕ Otra estación (no está en la lista)" },
    ],
    [estaciones]
  );

  // Al cambiar de vehículo: si tiene un solo combustible, lo autoselecciona
  useEffect(() => {
    if (combustibles.length === 1) {
      setTipoId(combustibles[0].id);
    } else {
      setTipoId("");
    }
  }, [vehiculoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.success) {
      setExito(true);
      setTanqueLleno(false);
      formRef.current?.reset();
      setVehiculoId("");
      setTipoId("");
      setOdometro("");
      setLitros("");
      setTotal("");
      setEstacionId("");
      setChoferId("");
      setFecha("");
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    }
  }, [state.success]);

  const hoy = fechaHoraLocalInput();

  const opcionesVehiculos = useMemo(
    () => vehiculos.map((v) => ({ id: v.id, nombre: `${v.nombre} · ${v.patente}` })),
    [vehiculos]
  );

  if (exito && state.success)
    return (
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="card flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ok-suave text-ok">
            <CheckCircle2 size={34} strokeWidth={2.4} />
          </span>
          <p className="font-display text-2xl font-extrabold">¡Listo, carga guardada!</p>
          <p className="max-w-xs text-sm font-semibold text-suave">{state.success}</p>
          <div className="mt-4 grid w-full gap-3">
            <button type="button" className="btn-primary w-full" onClick={() => setExito(false)}>
              <Plus size={20} strokeWidth={2.6} /> Registrar otra carga
            </button>
            <Link href="/dashboard" className="btn-ghost w-full">
              <House size={20} strokeWidth={2.4} /> Ir al inicio
            </Link>
          </div>
        </div>
        {state.comprobante ? <ComprobanteCompartir comprobante={state.comprobante} /> : null}
      </div>
    );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (enviando.current) {
          e.preventDefault();
          return;
        }
        if (!estacionId) {
          e.preventDefault();
          setFaltaEstacion(true);
          return;
        }
        enviando.current = true;
      }}
      className="space-y-4 pb-20 lg:pb-0"
    >
      {state.error ? (
        <div role="alert" className="flex items-start gap-3 rounded-tarjeta bg-error-suave p-4 text-sm font-bold text-error">
          <AlertCircle size={20} strokeWidth={2.6} className="mt-0.5 shrink-0" />
          {state.error}
        </div>
      ) : null}

      {choferes ? (
        <section className={`card ${olvidada ? "ring-2 ring-alerta/40" : ""}`}>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand"
              checked={olvidada}
              onChange={(e) => setOlvidada(e.target.checked)}
            />
            <span className="flex items-center gap-2 font-extrabold">
              <CalendarClock size={20} strokeWidth={2.4} className="text-alerta" />
              Registrar una carga que un chofer se olvidó
            </span>
          </label>
          {olvidada ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="modo" value="olvidada" />
              <input type="hidden" name="chofer_id" value={choferId} />
              <div>
                <label className="label">Chofer que hizo la carga</label>
                <Combobox options={choferes} value={choferId} onChange={setChoferId} placeholder="Buscar chofer…" />
              </div>
              <div>
                <label className="label" htmlFor="registrado_en">
                  Fecha y hora real de la carga
                </label>
                <input
                  id="registrado_en"
                  name="registrado_en"
                  type="datetime-local"
                  className="field"
                  value={fecha}
                  max={hoy}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <label className="label" htmlFor="motivo">
                  Motivo
                </label>
                <input
                  id="motivo"
                  name="motivo"
                  type="text"
                  className="field"
                  placeholder="Ej. el chofer se olvidó de registrarla"
                  minLength={3}
                  required
                />
                <p className="mt-1.5 text-xs font-semibold text-alerta">
                  La carga queda a nombre del chofer y con la fecha que pongas. En el Historial se ve que la registró
                  administración.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start [&>*]:min-w-0">
        <div className="space-y-4">
          <Seccion titulo="Vehículo" icono={<Truck size={18} strokeWidth={2.6} />}>
            <input type="hidden" name="vehiculo_id" value={vehiculoId} />
            <Combobox
              options={opcionesVehiculos}
              value={vehiculoId}
              onChange={setVehiculoId}
              placeholder="Buscar por nombre o patente…"
              allLabel="Elegí un vehículo…"
            />
            <div className="mt-4">
              <p className="label">Combustible</p>
              <input type="hidden" name="tipo_combustible_id" value={tipoId} />
              {!vehiculo ? (
                <p className="rounded-boton bg-fondo px-4 py-3 text-sm font-bold text-tenue">Elegí primero el vehículo</p>
              ) : combustibles.length === 0 ? (
                <p className="rounded-boton bg-alerta-suave px-4 py-3 text-sm font-bold text-alerta">
                  Este vehículo no tiene combustibles configurados. Avisá al administrador.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Combustible">
                  {combustibles.map((c) => {
                    const on = c.id === tipoId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTipoId(c.id)}
                        className={`flex min-h-[52px] items-center gap-2 rounded-boton border-2 px-4 text-left font-extrabold transition active:scale-[0.98] ${
                          on ? "border-brand bg-brand-suave text-brand-dark" : "border-linea bg-white text-tinta"
                        }`}
                      >
                        <Fuel size={18} strokeWidth={2.4} className={on ? "text-brand" : "text-tenue"} />
                        {c.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Seccion>

          <Seccion titulo="Kilometraje y carga" icono={<Gauge size={18} strokeWidth={2.6} />}>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="odometro_view">
                  Kilometraje (odómetro)
                </label>
                <input type="hidden" name="odometro_km" value={odometro} />
                <div className="relative">
                  <input
                    id="odometro_view"
                    type="text"
                    inputMode="numeric"
                    className="field pr-14 font-display text-xl font-bold"
                    placeholder="154.320"
                    value={fmtMiles(odometro)}
                    onChange={(e) => setOdometro(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-tenue">km</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="litros">
                    Litros
                  </label>
                  <div className="relative">
                    <input
                      id="litros"
                      name="litros"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="field pr-9 font-display text-xl font-bold"
                      placeholder="45,5"
                      value={litros}
                      onChange={(e) => setLitros(e.target.value)}
                      required
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-tenue">L</span>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="total_view">
                    Total (Gs.)
                  </label>
                  <input type="hidden" name="total" value={total} />
                  <input
                    id="total_view"
                    type="text"
                    inputMode="numeric"
                    className="field font-display text-xl font-bold"
                    placeholder="450.000"
                    value={fmtMiles(total)}
                    onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>

              <div className="rounded-tarjeta bg-marca p-4 text-white">
                <p className="text-xs font-extrabold uppercase tracking-wider text-white/70">Precio por litro</p>
                <p className="font-display text-3xl font-extrabold leading-tight">
                  {precioLitro != null
                    ? `Gs. ${precioLitro.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                    : "—"}
                </p>
                <p className="text-xs font-semibold text-white/70">
                  {precioLitro != null
                    ? `${Number(litros).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L por Gs. ${fmtMiles(total)}`
                    : "Se calcula solo: total ÷ litros"}
                </p>
              </div>

              <div>
                <p className="label">¿Llenaste el tanque?</p>
                {tanqueLleno ? <input type="hidden" name="tanque_lleno" value="on" /> : null}
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tanque lleno">
                  {[
                    [true, "Sí, lleno"],
                    [false, "No"],
                  ].map(([v, t]) => {
                    const on = tanqueLleno === v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTanqueLleno(v as boolean)}
                        className={`min-h-[52px] rounded-boton border-2 font-extrabold transition active:scale-[0.98] ${
                          on ? "border-brand bg-brand-suave text-brand-dark" : "border-linea bg-white text-tinta"
                        }`}
                      >
                        {t as string}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs font-semibold text-tenue">Con tanque lleno el consumo se calcula mejor.</p>
              </div>
            </div>
          </Seccion>
        </div>

        <div className="space-y-4">
          <Seccion titulo="Estación" icono={<MapPin size={18} strokeWidth={2.6} />}>
            <input type="hidden" name="estacion_id" value={esOtra ? "" : estacionId} />
            {esOtra ? <input type="hidden" name="estacion_otra" value="1" /> : null}
            <Combobox
              options={opcionesEstaciones}
              value={estacionId}
              onChange={(id) => {
                setEstacionId(id);
                if (id) setFaltaEstacion(false);
              }}
              placeholder="Buscar estación…"
              allLabel="Elegí la estación…"
            />
            {faltaEstacion ? (
              <p className="mt-1.5 text-sm font-bold text-error">
                Elegí la estación. Si no está en la lista, elegí «Otra estación».
              </p>
            ) : null}
            {esOtra ? (
              <div className="mt-4 grid gap-3 rounded-2xl bg-alerta-suave p-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="emblema_id">
                    Emblema
                  </label>
                  <select id="emblema_id" name="emblema_id" className="field" defaultValue="" required>
                    <option value="" disabled>
                      Elegí…
                    </option>
                    {emblemas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="estacion_nombre">
                    Nombre o zona
                  </label>
                  <input
                    id="estacion_nombre"
                    name="estacion_nombre"
                    type="text"
                    className="field"
                    placeholder="Ej. Ruta 2, Itauguá"
                    minLength={2}
                    required
                  />
                </div>
              </div>
            ) : null}
          </Seccion>

          <Seccion titulo="Detalles" icono={<ClipboardPen size={18} strokeWidth={2.6} />}>
            {olvidada ? null : (
              <p className="mb-4 flex items-center gap-2 rounded-boton bg-fondo px-4 py-3 text-sm font-bold text-suave">
                <CalendarClock size={18} strokeWidth={2.4} className="text-tenue" />
                Se registra con la fecha y hora de ahora
              </p>
            )}
            <label className="label" htmlFor="notas">
              Notas <span className="font-semibold text-tenue">(opcional)</span>
            </label>
            <textarea id="notas" name="notas" rows={2} className="field" placeholder="Observaciones…" />
          </Seccion>

          <Submit />
        </div>
      </div>
    </form>
  );
}
