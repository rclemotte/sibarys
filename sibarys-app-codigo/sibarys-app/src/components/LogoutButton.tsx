import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

/** Cerrar sesión. "icono": solo ícono (barra lateral); "fila": botón ancho (pantalla Más). */
export default function LogoutButton({ variante = "icono" }: { variante?: "icono" | "fila" }) {
  return (
    <form action={logout}>
      {variante === "icono" ? (
        <button
          type="submit"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2.4} />
        </button>
      ) : (
        <button type="submit" className="btn-ghost w-full text-error">
          <LogOut size={20} strokeWidth={2.4} /> Cerrar sesión
        </button>
      )}
    </form>
  );
}
