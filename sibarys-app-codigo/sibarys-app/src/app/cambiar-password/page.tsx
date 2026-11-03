import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CambiarPasswordForm from "./CambiarPasswordForm";
import PantallaAcceso from "@/components/ui/PantallaAcceso";

export const dynamic = "force-dynamic";

export default async function CambiarPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <PantallaAcceso titulo="Cambiá tu contraseña" subtitulo="Elegí una contraseña nueva para continuar.">
      <CambiarPasswordForm />
    </PantallaAcceso>
  );
}
