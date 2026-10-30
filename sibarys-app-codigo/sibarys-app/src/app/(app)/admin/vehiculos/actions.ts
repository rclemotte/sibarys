"use server";

import { tienePermiso } from "@/lib/permisos";
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
    .select("*")
    .eq("id", user.id)
    .single();
  return { supabase, ok: tienePermiso(perfil, "puede_editar_vehiculos") };
}

export type VehState = { error?: string; success?: string };

/** Campos del límite de km (solo alquilados). */
function leerKm(formData: FormData, es_alquilado: boolean) {
  const num = (k: string) => {
    const r = String(formData.get(k) ?? "").trim();
    return r ? Number(r) : null;
  };
  const desde = String(formData.get("km_control_desde") || "").trim() || null;
  if (!es_alquilado || !desde)
    return { datos: { km_control_desde: null }, error: null as string | null };
  const km_limite = num("km_limite") ?? 5000;
  const km_aviso = num("km_aviso") ?? 500;
  const km_inicial = num("km_inicial");
  if (!(km_limite > 0)) return { datos: {}, error: "El límite de km tiene que ser mayor a 0." };
  if (!(km_aviso >= 0) || km_aviso >= km_limite)
    return { datos: {}, error: "El aviso tiene que ser menor al límite de km." };
  if (km_inicial != null && !(km_inicial >= 0))
    return { datos: {}, error: "Los km al inicio no son válidos." };
  return {
    datos: { km_control_desde: desde, km_limite, km_aviso, km_inicial },
    error: null as string | null,
  };
}

const FALTA_SQL_KM =
  "Falta correr el SQL migracion_km_alquilados.sql en Supabase para guardar el límite de km.";

export async function crearVehiculo(
  _prev: VehState,
  formData: FormData
): Promise<VehState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "No tenés permiso para agregar vehículos." };

  const patente = String(formData.get("patente") || "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const marca = String(formData.get("marca") || "").trim() || null;
  const modelo = String(formData.get("modelo") || "").trim() || null;
  const anioRaw = formData.get("anio");
  const anio = anioRaw && String(anioRaw).trim() ? Number(anioRaw) : null;
  const capRaw = formData.get("capacidad_tanque_litros");
  const capacidad_tanque_litros =
    capRaw && String(capRaw).trim() ? Number(capRaw) : null;
  const consRaw = formData.get("consumo_ref_l100km");
  const consumo_ref_l100km =
    consRaw && String(consRaw).trim() ? Number(consRaw) : null;
  const es_alquilado = formData.get("es_alquilado") === "on";
  const empresa_id = es_alquilado
    ? String(formData.get("empresa_id") || "").trim() || null
    : null;
  const combustibles = formData.getAll("combustibles").map(String);
  const km = leerKm(formData, es_alquilado);
  if (km.error) return { error: km.error };
  // Solo se mandan si hay fecha (así funciona aunque falte el SQL)
  const datosKm = km.datos.km_control_desde ? km.datos : {};

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
      consumo_ref_l100km,
      es_alquilado,
      empresa_id,
      ...datosKm,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message?.includes("km_")) return { error: FALTA_SQL_KM };
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

export async function guardarDatosVehiculo(
  _prev: VehState,
  formData: FormData
): Promise<VehState> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "No tenés permiso para editar vehículos." };
  const id = String(formData.get("vehiculo_id"));

  // Patente y nombre (la patente puede cambiar, ej. de chapa provisoria a definitiva)
  const patente = String(formData.get("patente") || "")
    .trim()
    .toUpperCase();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!patente) return { error: "Ingresá la patente." };
  if (!nombre) return { error: "Ingresá el nombre del vehículo." };

  const capRaw = formData.get("capacidad_tanque_litros");
  const capacidad_tanque_litros =
    capRaw && String(capRaw).trim() ? Number(capRaw) : null;
  const consRaw = formData.get("consumo_ref_l100km");
  const consumo_ref_l100km =
    consRaw && String(consRaw).trim() ? Number(consRaw) : null;
  const es_alquilado = formData.get("es_alquilado") === "on";
  const empresa_id = es_alquilado
    ? String(formData.get("empresa_id") || "").trim() || null
    : null;

  const km = leerKm(formData, es_alquilado);
  if (km.error) return { error: km.error };
  // Se guarda si hay fecha, o si antes tenía y la borraron (deja de controlar).
  // Si no hay nada que guardar no se manda (funciona aunque falte el SQL).
  const datosKm =
    km.datos.km_control_desde || formData.get("tenia_km") === "1" ? km.datos : {};

  const { error } = await supabase
    .from("vehiculos")
    .update({
      patente,
      nombre,
      capacidad_tanque_litros,
      consumo_ref_l100km,
      es_alquilado,
      empresa_id,
      ...datosKm,
    })
    .eq("id", id);

  if (error) {
    if (error.message?.includes("km_")) return { error: FALTA_SQL_KM };
    if (error.code === "23505")
      return { error: "Ya existe otro vehículo con esa patente." };
    return { error: "No se pudo guardar: " + error.message };
  }

  revalidatePath("/admin/vehiculos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes/km-alquilados");
  return { success: "Datos guardados." };
}

export async function toggleVehiculo(formData: FormData) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("vehiculos").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/vehiculos");
}
