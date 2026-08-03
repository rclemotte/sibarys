import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import AdminNav from "@/components/AdminNav";
import NuevoUsuarioForm from "./NuevoUsuarioForm";
import { cambiarRol, toggleActivo } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChoferesPage() {
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
    .from("perfiles")
    .select("*")
    .order("creado_en", { ascending: true });
  const personas = (data || []) as Perfil[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <NuevoUsuarioForm />

      <ul className="space-y-2">
        {personas.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {p.nombre_completo || "(sin nombre)"}
              </p>
              <p className="text-xs text-slate-400">
                {p.rol === "admin" ? "Administrador" : "Chofer"} · alta{" "}
                {fmtDate(p.creado_en)}
                {!p.activo ? " · inactivo" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <form action={cambiarRol}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="rol" value={p.rol} />
                <button
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  disabled={p.id === user.id}
                  title={
                    p.id === user.id ? "No podés cambiar tu propio rol" : ""
                  }
                >
                  {p.rol === "admin" ? "→ Chofer" : "→ Admin"}
                </button>
              </form>
              <form action={toggleActivo}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="activo" value={String(p.activo)} />
                <button className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {p.activo ? "Baja" : "Alta"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
