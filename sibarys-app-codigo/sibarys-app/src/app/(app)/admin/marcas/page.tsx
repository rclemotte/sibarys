import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Marca } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import MarcaForm from "./MarcaForm";
import { toggleMarca } from "./actions";

export const dynamic = "force-dynamic";

export default async function MarcasPage() {
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
    .from("marcas")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  const marcas = (data || []) as Marca[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <MarcaForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Marcas cargadas
        </h2>
        <ul className="space-y-2">
          {marcas.map((m) => (
            <li
              key={m.id}
              className="card flex items-center justify-between gap-3"
            >
              <p className="font-semibold">
                {m.nombre}{" "}
                {!m.activo ? (
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    inactiva
                  </span>
                ) : null}
              </p>
              <form action={toggleMarca}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="activo" value={String(m.activo)} />
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {m.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {marcas.length === 0 ? (
            <li className="card text-center text-sm text-slate-400">
              Todavía no hay marcas. Agregá una arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
