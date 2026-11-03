import { redirect } from "next/navigation";
import { tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import type { Emblema } from "@/lib/types";
import EncabezadoAdmin from "@/components/EncabezadoAdmin";
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!tienePermiso(yo, "puede_editar_catalogos")) {
    return (
      <div className="card text-center text-sm text-suave">
        No tenés permiso para esta sección. Pedíselo al súper admin.
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
    <div className="space-y-5">
      <EncabezadoAdmin seccion="/admin/emblemas" />

      <EmblemaForm />

      <div>
        <h2 className="mb-2 px-1 font-display text-lg font-extrabold text-tinta">
          Emblemas cargados
        </h2>
        <ul className="space-y-2">
          {emblemas.map((e) => (
            <li
              key={e.id}
              className="card flex items-center justify-between gap-3"
            >
              <p className="font-extrabold">
                {e.nombre}{" "}
                {!e.activo ? (
                  <span className="ml-1 rounded bg-neutro-suave px-1.5 py-0.5 text-[10px] text-suave">
                    inactivo
                  </span>
                ) : null}
              </p>
              <form action={toggleEmblema}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="activo" value={String(e.activo)} />
                <button className="rounded-lg border border-linea px-3 py-1.5 text-xs font-bold text-suave hover:bg-fondo">
                  {e.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {emblemas.length === 0 ? (
            <li className="card text-center text-sm text-tenue">
              Todavía no hay emblemas. Agregá uno arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
