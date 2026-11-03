import { redirect } from "next/navigation";
import { tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney, hoyLocal } from "@/lib/format";

const fmtDate = (ymd: string) => ymd.split("-").reverse().join("/");
import EncabezadoAdmin from "@/components/EncabezadoAdmin";
import TarifaForms, { BorrarPrecio } from "./TarifaForms";

export const dynamic = "force-dynamic";

type Precio = {
  id: string;
  emblema_id: string;
  tipo_combustible_id: string;
  precio: number;
  vigente_desde: string;
};

/** Precios de referencia por emblema y combustible (solo para control). */
export default async function PreciosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: yo } = await supabase.from("perfiles").select("*").eq("id", user.id).single();

  if (!tienePermiso(yo, "puede_editar_catalogos")) {
    return (
      <div className="space-y-5">
        <EncabezadoAdmin seccion="/admin/tarifas" />
        <div className="card text-center text-sm text-suave">
          No tenés permiso para esta sección. Pedíselo al súper admin.
        </div>
      </div>
    );
  }

  const [{ data: es }, { data: ts }, { data: ps, error }] = await Promise.all([
    supabase.from("emblemas").select("id, nombre, activo").order("nombre"),
    supabase.from("tipos_combustible").select("id, nombre, activo").order("nombre"),
    supabase
      .from("precios_emblema")
      .select("id, emblema_id, tipo_combustible_id, precio, vigente_desde")
      .order("vigente_desde", { ascending: false })
      .limit(1000),
  ]);
  const emblemas = (es || []).filter((e: any) => e.activo !== false) as { id: string; nombre: string }[];
  const tipos = (ts || []).filter((t: any) => t.activo !== false) as { id: string; nombre: string }[];
  const precios = (ps || []) as Precio[];
  const hoy = hoyLocal();
  const nombreTipo = new Map((ts || []).map((t: any) => [t.id as string, t.nombre as string]));

  return (
    <div className="space-y-5">
      <EncabezadoAdmin seccion="/admin/tarifas" />
      <p className="px-1 text-sm font-semibold text-suave">Precio por litro de cada emblema y combustible. Se usa solo para controlar lo que pagan los choferes (Reportes → Control de precios); no cambia cómo cargan.</p>

      {error ? (
        <div className="card text-center text-sm text-alerta">
          Falta correr el SQL migracion_precios_emblema.sql en Supabase.
        </div>
      ) : (
        <>
          <TarifaForms emblemas={emblemas} tipos={tipos} />

          <ul className="space-y-2">
            {emblemas.map((e) => {
              const propios = precios.filter((p) => p.emblema_id === e.id);
              const tiposCon = Array.from(new Set(propios.map((p) => p.tipo_combustible_id)));
              return (
                <li key={e.id} className="card">
                  <p className="font-extrabold">{e.nombre}</p>
                  {tiposCon.length === 0 ? (
                    <p className="text-xs text-tenue">Sin precios cargados.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {tiposCon
                        .sort((a, b) =>
                          (nombreTipo.get(a) ?? "").localeCompare(nombreTipo.get(b) ?? ""),
                        )
                        .map((tid) => {
                          const hist = propios.filter((p) => p.tipo_combustible_id === tid);
                          const actual = hist.find((p) => p.vigente_desde <= hoy);
                          const futuro = hist.filter((p) => p.vigente_desde > hoy).at(-1);
                          return (
                            <li key={tid} className="border-t border-linea pt-1 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span>{nombreTipo.get(tid) ?? "—"}</span>
                                <span className="font-semibold text-brand">
                                  {actual ? `${fmtMoney(actual.precio)}/L` : "—"}
                                </span>
                              </div>
                              <p className="text-xs text-tenue">
                                {actual ? `Desde ${fmtDate(actual.vigente_desde)}` : "Sin precio vigente"}
                                {futuro
                                  ? ` · desde ${fmtDate(futuro.vigente_desde)}: ${fmtMoney(futuro.precio)}/L`
                                  : ""}
                              </p>
                              <details className="text-xs">
                                <summary className="cursor-pointer text-brand">
                                  Historial ({hist.length})
                                </summary>
                                <ul className="mt-1 space-y-0.5 text-suave">
                                  {hist.map((h) => (
                                    <li key={h.id} className="flex justify-between">
                                      <span>{fmtDate(h.vigente_desde)}</span>
                                      <span>
                                        {fmtMoney(h.precio)}/L
                                        <BorrarPrecio id={h.id} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
