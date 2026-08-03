import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  TipoCombustible,
  PrecioVigente,
  PrecioCombustible,
} from "@/lib/types";
import { fmtMoney, fmtDate } from "@/lib/format";
import AdminNav from "@/components/AdminNav";
import TarifaForms from "./TarifaForms";

export const dynamic = "force-dynamic";

export default async function TarifasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: yo } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (yo?.rol !== "admin") {
    return (
      <div className="card text-center text-sm text-slate-500">
        Esta sección es solo para administradores.
      </div>
    );
  }

  const [{ data: ts }, { data: pv }, { data: hist }] = await Promise.all([
    supabase
      .from("tipos_combustible")
      .select("*")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("precios_vigentes").select("*"),
    supabase
      .from("precios_combustible")
      .select("*")
      .order("vigente_desde", { ascending: false })
      .limit(50),
  ]);

  const tipos = (ts || []) as TipoCombustible[];

  const precioActual = new Map<string, PrecioVigente>();
  (pv || []).forEach((p: PrecioVigente) =>
    precioActual.set(p.tipo_combustible_id, p)
  );

  const historialPorTipo = new Map<string, PrecioCombustible[]>();
  (hist || []).forEach((h: PrecioCombustible) => {
    const arr = historialPorTipo.get(h.tipo_combustible_id) || [];
    arr.push(h);
    historialPorTipo.set(h.tipo_combustible_id, arr);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <TarifaForms tipos={tipos} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Combustibles y precio vigente
        </h2>
        <ul className="space-y-2">
          {tipos.map((t) => {
            const actual = precioActual.get(t.id);
            const historial = historialPorTipo.get(t.id) || [];
            return (
              <li key={t.id} className="card">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{t.nombre}</p>
                  <p className="text-sm font-semibold text-brand">
                    {actual ? `${fmtMoney(actual.precio)}/L` : "—"}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {actual
                    ? `Vigente desde ${fmtDate(actual.vigente_desde)}`
                    : "Sin precio cargado"}
                </p>

                {historial.length > 1 ? (
                  <details className="mt-2 border-t border-slate-100 pt-2">
                    <summary className="cursor-pointer text-xs text-brand">
                      Ver historial ({historial.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {historial.map((h) => (
                        <li key={h.id} className="flex justify-between">
                          <span>{fmtDate(h.vigente_desde)}</span>
                          <span>{fmtMoney(h.precio)}/L</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
          {tipos.length === 0 ? (
            <li className="card text-center text-sm text-slate-400">
              No hay combustibles activos. Agregalos en la pestaña Combustibles.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
