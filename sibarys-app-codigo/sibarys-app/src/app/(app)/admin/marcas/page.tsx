import { redirect } from "next/navigation";
import { tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import type { Marca } from "@/lib/types";
import EncabezadoAdmin from "@/components/EncabezadoAdmin";
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
    .from("marcas")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  const marcas = (data || []) as Marca[];

  return (
    <div className="space-y-5">
      <EncabezadoAdmin seccion="/admin/marcas" />

      <MarcaForm />

      <div>
        <h2 className="mb-2 px-1 font-display text-lg font-extrabold text-tinta">
          Marcas cargadas
        </h2>
        <ul className="space-y-2">
          {marcas.map((m) => (
            <li
              key={m.id}
              className="card flex items-center justify-between gap-3"
            >
              <p className="font-extrabold">
                {m.nombre}{" "}
                {!m.activo ? (
                  <span className="ml-1 rounded bg-neutro-suave px-1.5 py-0.5 text-[10px] text-suave">
                    inactiva
                  </span>
                ) : null}
              </p>
              <form action={toggleMarca}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="activo" value={String(m.activo)} />
                <button className="rounded-lg border border-linea px-3 py-1.5 text-xs font-bold text-suave hover:bg-fondo">
                  {m.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {marcas.length === 0 ? (
            <li className="card text-center text-sm text-tenue">
              Todavía no hay marcas. Agregá una arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
