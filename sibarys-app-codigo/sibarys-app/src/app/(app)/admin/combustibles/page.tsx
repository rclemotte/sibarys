import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TipoCombustible } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import CombustibleForm from "./CombustibleForm";
import { toggleCombustible } from "./actions";

export const dynamic = "force-dynamic";

export default async function CombustiblesPage() {
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

  const { data } = await supabase
    .from("tipos_combustible")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  const tipos = (data || []) as TipoCombustible[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <CombustibleForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Combustibles cargados
        </h2>
        <ul className="space-y-2">
          {tipos.map((t) => (
            <li
              key={t.id}
              className="card flex items-center justify-between gap-3"
            >
              <p className="font-semibold">
                {t.nombre}
                {t.octanaje ? (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (oct. {t.octanaje})
                  </span>
                ) : null}
                {!t.activo ? (
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    inactivo
                  </span>
                ) : null}
              </p>
              <form action={toggleCombustible}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="activo" value={String(t.activo)} />
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {t.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {tipos.length === 0 ? (
            <li className="card text-center text-sm text-slate-400">
              Todavía no hay combustibles. Agregá uno arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
