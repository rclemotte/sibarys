"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  return { supabase, ok: perfil?.rol === "admin" };
}

export type VehState = { error?: string; success?: string };

export async function crearVehiculo(
  _prev: VehState,
  formData: FormData
): Promise<VehState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Solo el administrador puede agregar vehículos." };

  const patente = String(formData.get("patente") || "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const marca = String(formData.get("marca") || "").trim() || null;
  const modelo = String(formData.get("modelo") || "").trim() || null;
  const anioRaw = formData.get("anio");
  const anio = anioRaw && String(anioRaw).trim() ? Number(anioRaw) : null;
  const capRaw = formData.get("capacidad_tanque_litros");
  const capacidad_tanque_litros =
    capRaw && String(capRaw).trim() ? Number(capRaw) : null;
  const consRaw = formData.get("consumo_promedio_asignado");
  const consumo_promedio_asignado =
    consRaw && String(consRaw).trim() ? Number(consRaw) : null;
  const es_alquilado = formData.get("es_alquilado") === "on";
  const empresa_id = es_alquilado
    ? String(formData.get("empresa_id") || "").trim() || null
    : null;
  const combustibles = formData.getAll("combustibles").map(String);

  if (!patente) return { error: "Ingresá la patente." };
  if (!nombre) return { error: "Ingresá un nombre/alias." };
  if (combustibles.length === 0)
    return { error: "Elegí al menos un tipo de combustible." };

  const { data: veh, error } = await supabase
    .from("vehiculos")
    .insert({
      patente,
      nombre,
      marca,
      modelo,
      anio,
      capacidad_tanque_litros,
      consumo_promedio_asignado,
      es_alquilado,
      empresa_id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe un vehículo con esa patente." };
    return { error: "No se pudo crear: " + error.message };
  }

  const rows = combustibles.map((tid) => ({
    vehiculo_id: veh!.id,
    tipo_combustible_id: tid,
  }));
  await supabase.from("vehiculo_combustibles").insert(rows);

  revalidatePath("/admin/vehiculos");
  return { success: "Vehículo agregado." };
}

export async function guardarCombustibles(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const vehiculo_id = String(formData.get("vehiculo_id"));
  const combustibles = formData.getAll("combustibles").map(String);

  await supabase
    .from("vehiculo_combustibles")
    .delete()
    .eq("vehiculo_id", vehiculo_id);

  if (combustibles.length > 0) {
    await supabase.from("vehiculo_combustibles").insert(
      combustibles.map((tid) => ({
        vehiculo_id,
        tipo_combustible_id: tid,
      }))
    );
  }
  revalidatePath("/admin/vehiculos");
}

export async function guardarDatosVehiculo(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("vehiculo_id"));

  const capRaw = formData.get("capacidad_tanque_litros");
  const capacidad_tanque_litros =
    capRaw && String(capRaw).trim() ? Number(capRaw) : null;
  const consRaw = formData.get("consumo_promedio_asignado");
  const consumo_promedio_asignado =
    consRaw && String(consRaw).trim() ? Number(consRaw) : null;
  const es_alquilado = formData.get("es_alquilado") === "on";
  const empresa_id = es_alquilado
    ? String(formData.get("empresa_id") || "").trim() || null
    : null;

  await supabase
    .from("vehiculos")
    .update({
      capacidad_tanque_litros,
      consumo_promedio_asignado,
      es_alquilado,
      empresa_id,
    })
    .eq("id", id);
  revalidatePath("/admin/vehiculos");
}

export async function toggleVehiculo(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("vehiculos").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/vehiculos");
}
