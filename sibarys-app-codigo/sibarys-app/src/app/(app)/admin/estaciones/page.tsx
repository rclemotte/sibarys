import { redirect } from "next/navigation";
import { tienePermiso } from "@/lib/permisos";
import { createClient } from "@/lib/supabase/server";
import type { Emblema } from "@/lib/types";
import EncabezadoAdmin from "@/components/EncabezadoAdmin";
import EstacionForm from "./EstacionForm";
import { toggleEstacion } from "./actions";

export const dynamic = "force-dynamic";

type EstacionRow = {
  id: string;
  nombre: string;
  localidad: string | null;
  activo: boolean;
  emblemas: { nombre: string } | null;
};

export default async function EstacionesPage() {
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

  const [{ data: es }, { data: em }] = await Promise.all([
    supabase
      .from("estaciones_servicio")
      .select("id, nombre, localidad, activo, emblemas(nombre)")
      .order("activo", { ascending: false })
      .order("nombre"),
    supabase.from("emblemas").select("*").eq("activo", true).order("nombre"),
  ]);

  const estaciones = (es || []) as unknown as EstacionRow[];
  const emblemas = (em || []) as Emblema[];

  return (
    <div className="space-y-5">
      <EncabezadoAdmin seccion="/admin/estaciones" />

      <EstacionForm emblemas={emblemas} />

      <div>
        <h2 className="mb-2 px-1 font-display text-lg font-extrabold text-tinta">
          Estaciones cargadas
        </h2>
        <ul className="space-y-2">
          {estaciones.map((e) => (
            <li
              key={e.id}
              className="card flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-extrabold">
                  {e.nombre}{" "}
                  {!e.activo ? (
                    <span className="ml-1 rounded bg-neutro-suave px-1.5 py-0.5 text-[10px] text-suave">
                      inactiva
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-tenue">
                  {e.emblemas?.nombre || "Sin emblema"}
                  {e.localidad ? ` · ${e.localidad}` : ""}
                </p>
              </div>
              <form action={toggleEstacion}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="activo" value={String(e.activo)} />
                <button className="rounded-lg border border-linea px-3 py-1.5 text-xs font-bold text-suave hover:bg-fondo">
                  {e.activo ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
          {estaciones.length === 0 ? (
            <li className="card text-center text-sm text-tenue">
              Todavía no hay estaciones. Agregá una arriba.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
