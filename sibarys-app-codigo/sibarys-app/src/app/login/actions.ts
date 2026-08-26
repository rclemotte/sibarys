"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cedulaAEmail } from "@/lib/auth";

export async function login(_prev: unknown, formData: FormData) {
  const cedula = String(formData.get("cedula") || "").trim();
  const password = String(formData.get("password") || "");

  if (!cedula || !password) {
    return { error: "Ingresá tu cédula y contraseña." };
  }

  const email = cedulaAEmail(cedula);
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Cédula o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
