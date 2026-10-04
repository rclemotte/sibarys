import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import NuevoUsuarioForm from "./NuevoUsuarioForm";
import AsignarPasswordForm from "./AsignarPasswordForm";
import { cambiarRol, guardarPermisos, toggleActivo } from "./actions";
import {
  PERMISOS,
  esSuperadmin,
  perfilActual,
  textoRol,
  tienePermiso,
} from "@/lib/permisos";

export const dynamic = "force-dynamic";

const btn =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40";

export default async function ChoferesPage() {
  const supabase = createClient();
  const yo = await perfilActual(supabase);
  if (!yo) redirect("/login");

  if (!tienePermiso(yo, "puede_gestionar_usuarios")) {
    return (
      <div className="card text-center text-sm text-slate-500">
        No tenés permiso para esta sección. Pedíselo al súper admin.
      </div>
    );
  }

  const esSuper = esSuperadmin(yo.rol);

  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .order("creado_en", { ascending: true });
  // Un admin común solo ve choferes; el superadmin ve a todos.
  const personas = ((data || []) as Perfil[]).filter(
    (p) => esSuper || p.rol === "chofer" || p.id === yo.id
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <AdminNav />

      <NuevoUsuarioForm puedeCrearAdmin={esSuper} />

      <ul className="space-y-2">
        {personas.map((p) => {
          const soyYo = p.id === yo.id;
          const puedeTocar = esSuper || p.rol === "chofer";
          return (
            <li key={p.id} className="card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {p.nombre_completo || "(sin nombre)"}
                    {soyYo ? (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        (vos)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.cedula ? `Cédula ${p.cedula} · ` : ""}
                    {textoRol(p.rol)}
                    {!p.activo ? " · inactivo" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {esSuper && !soyYo && p.rol !== "superadmin" ? (
                    <form action={cambiarRol}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className={btn}>
                        {p.rol === "admin" ? "→ Chofer" : "→ Admin"}
                      </button>
                    </form>
                  ) : null}
                  {puedeTocar && !soyYo ? (
                    <form action={toggleActivo}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="activo"
                        value={String(p.activo)}
                      />
                      <button className={btn}>
                        {p.activo ? "Baja" : "Alta"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              {esSuper && p.rol === "admin" ? (
                <details className="rounded-xl bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand">
                    Permisos de edición
                  </summary>
                  <form action={guardarPermisos} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={p.id} />
                    {PERMISOS.map((perm) => (
                      <label
                        key={perm.campo}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <input
                          type="checkbox"
                          name={perm.campo}
                          defaultChecked={tienePermiso(p, perm.campo)}
                          className="mt-0.5 h-4 w-4 accent-brand"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                    <button className="btn-primary w-full py-2 text-sm">
                      Guardar permisos
                    </button>
                  </form>
                </details>
              ) : null}

              {puedeTocar ? <AsignarPasswordForm id={p.id} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
