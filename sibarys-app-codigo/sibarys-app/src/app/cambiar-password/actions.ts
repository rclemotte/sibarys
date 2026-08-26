"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CambiarState = { error?: string };

export async function cambiarPassword(
  _prev: CambiarState,
  formData: FormData
): Promise<CambiarState> {
  const nueva = String(formData.get("password") || "");
  const confirmar = String(formData.get("confirmar") || "");

  if (nueva.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (nueva !== confirmar) return { error: "Las contraseñas no coinciden." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "No se pudo cambiar la contraseña: " + error.message };

  await supabase
    .from("perfiles")
    .update({ debe_cambiar_password: false })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
