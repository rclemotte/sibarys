import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Emblema } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import EmblemaForm from "./EmblemaForm";
import { toggleEmblema } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmblemasPage() {
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
    .from("emblemas")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  const emblemas = (data || []) as Emblema[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <EmblemaForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Emblemas cargados
        </h2>
        <ul className="space-y-2">
          {emblemas.map((e) => (
            <li
              key={e.id}
              className="card flex items-center justify-between gap-3"
            >
              <p className="font-semibold">
                {e.nombre}{" "}
                {!e.activo ? (
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    inactivo
                  </span>
                ) : null}
              </p>
              <form action={toggleEmblema}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="activo" value={String(e.activo)} />
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {e.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {emblemas.length === 0 ? (
            <li className="card text-center text-sm text-slate-400">
              Todavía no hay emblemas. Agregá uno arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
