"use server";

import { errorLitrosTanque } from "@/lib/consumo";
import { tienePermiso } from "@/lib/permisos";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoEstacion } from "@/lib/estaciones";
import { fechaHoraLocalInput, fmtDateTime, fmtNumber, instanteLocal } from "@/lib/format";

export type EditarState = { error?: string; success?: string };

const num = (v: FormDataEntryValue | null) =>
  Number(
    String(v ?? "")
      .trim()
      .replace(",", "."),
  );

/**
 * Administración corrige los datos de una carga mal ingresada.
 * El motivo es obligatorio y cada dato cambiado queda registrado en
 * cargas_correcciones (valor anterior, nuevo, quién y cuándo).
 */
export async function editarCarga(
  _prev: EditarState,
  formData: FormData,
): Promise<EditarState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Volvé a iniciar sesión." };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!tienePermiso(perfil, "puede_corregir_km"))
    return { error: "No tenés permiso para editar cargas." };

  const id = String(formData.get("id") || "");
  const vehiculo_id = String(formData.get("vehiculo_id") || "");
  const tipo_combustible_id =
    String(formData.get("tipo_combustible_id") || "") || null;
  const estacion_id = String(formData.get("estacion_id") || "").trim() || null;
  const odometro_km = num(formData.get("odometro_km"));
  const litros = num(formData.get("litros"));
  const total = num(formData.get("total"));
  const tanque_lleno = formData.get("tanque_lleno") === "on";
  const notas = String(formData.get("notas") || "").trim() || null;
  const motivo = String(formData.get("motivo") || "").trim();
  const chofer_id = String(formData.get("chofer_id") || "") || null;
  const fechaRaw = String(formData.get("registrado_en") || "");
  const fecha = instanteLocal(fechaRaw);

  if (!id) return { error: "Carga inválida." };
  if (!vehiculo_id) return { error: "Elegí el vehículo." };
  if (!tipo_combustible_id) return { error: "Elegí el combustible." };
  if (!Number.isFinite(odometro_km) || odometro_km <= 0)
    return { error: "Ingresá un kilometraje válido." };
  if (!Number.isFinite(litros) || litros <= 0)
    return { error: "Ingresá los litros." };
  if (!Number.isFinite(total) || total <= 0)
    return { error: "Ingresá el total cargado." };
  if (!fecha) return { error: "Ingresá la fecha y hora de la carga." };
  if (fecha.getTime() > Date.now() + 5 * 60000)
    return { error: "La fecha de la carga no puede ser futura." };
  if (!chofer_id) return { error: "Elegí el chofer." };
  if (motivo.length < 3)
    return { error: "Escribí el motivo de la corrección." };

  // Los litros no pueden superar la capacidad del tanque (+10%)
  const { data: vehNuevo } = await supabase
    .from("vehiculos")
    .select("nombre, capacidad_tanque_litros")
    .eq("id", vehiculo_id)
    .maybeSingle();
  if (vehNuevo) {
    const errTanque = errorLitrosTanque(litros, vehNuevo);
    if (errTanque)
      return {
        error:
          errTanque +
          " Si realmente entra más, corregí la capacidad del tanque en Vehículos.",
      };
  }

  // Carga actual (para comparar y registrar qué cambió)
  const { data: actual, error: errLeer } = await supabase
    .from("cargas")
    .select(
      "vehiculo_id, chofer_id, registrado_en, tipo_combustible_id, estacion_id, estacion, odometro_km, litros, costo_total, tanque_lleno, notas",
    )
    .eq("id", id)
    .maybeSingle();
  if (errLeer || !actual) return { error: "No se encontró la carga." };

  // Nombres para que el historial sea legible
  const ids = (a: (string | null)[]) => a.filter(Boolean) as string[];
  const [{ data: vs }, { data: ts }, { data: chs }] = await Promise.all([
    supabase
      .from("vehiculos")
      .select("id, nombre, patente")
      .in("id", ids([actual.vehiculo_id, vehiculo_id])),
    supabase
      .from("tipos_combustible")
      .select("id, nombre")
      .in("id", ids([actual.tipo_combustible_id, tipo_combustible_id])),
    supabase
      .from("perfiles")
      .select("id, nombre_completo")
      .in("id", ids([actual.chofer_id, chofer_id])),
  ]);
  const nomChofer = (cid: string | null) =>
    (chs || []).find((x: any) => x.id === cid)?.nombre_completo ?? "—";
  const nomVeh = (vid: string | null) => {
    const v = (vs || []).find((x: any) => x.id === vid);
    return v ? `${v.nombre} (${v.patente})` : "—";
  };
  const nomComb = (tid: string | null) =>
    (ts || []).find((x: any) => x.id === tid)?.nombre ?? "—";

  const estacion = await textoEstacion(supabase, estacion_id);

  const cambios: { campo: string; antes: string; despues: string }[] = [];
  const comparar = (campo: string, antes: string, despues: string) => {
    if (antes !== despues) cambios.push({ campo, antes, despues });
  };
  const cambioFecha =
    fechaHoraLocalInput(new Date(actual.registrado_en)) !== fechaRaw;
  if (cambioFecha)
    cambios.push({
      campo: "Fecha",
      antes: fmtDateTime(actual.registrado_en),
      despues: fmtDateTime(fecha.toISOString()),
    });
  comparar("Chofer", nomChofer(actual.chofer_id), nomChofer(chofer_id));
  comparar("Vehículo", nomVeh(actual.vehiculo_id), nomVeh(vehiculo_id));
  comparar(
    "Combustible",
    nomComb(actual.tipo_combustible_id),
    nomComb(tipo_combustible_id),
  );
  comparar(
    "Kilometraje",
    fmtNumber(Number(actual.odometro_km), 1),
    fmtNumber(odometro_km, 1),
  );
  comparar("Litros", fmtNumber(Number(actual.litros), 2), fmtNumber(litros, 2));
  comparar(
    "Total",
    fmtNumber(Number(actual.costo_total), 0),
    fmtNumber(total, 0),
  );
  if ((actual.estacion_id || null) !== estacion_id)
    cambios.push({
      campo: "Estación",
      antes: actual.estacion || "Sin especificar",
      despues: estacion || "Sin especificar",
    });
  comparar(
    "Tanque lleno",
    actual.tanque_lleno ? "Sí" : "No",
    tanque_lleno ? "Sí" : "No",
  );
  comparar("Notas", actual.notas || "—", notas || "—");

  if (cambios.length === 0) return { error: "No cambiaste ningún dato." };

  // 1) Registrar las correcciones primero (si falla, no se toca la carga)
  const ahora = new Date().toISOString();
  const { data: registradas, error: errHist } = await supabase
    .from("cargas_correcciones")
    .insert(
      cambios.map((c) => ({
        carga_id: id,
        campo: c.campo,
        valor_anterior: c.antes,
        valor_nuevo: c.despues,
        motivo,
        corregido_por: user.id,
        corregido_en: ahora,
      })),
    )
    .select("id");
  if (errHist)
    return {
      error:
        "No se pudo registrar la corrección. ¿Se corrió el SQL migracion_editar_cargas.sql? (" +
        errHist.message +
        ")",
    };

  // 2) Actualizar la carga
  const precio_litro = Math.round((total / litros) * 100) / 100;
  const { error } = await supabase
    .from("cargas")
    .update({
      vehiculo_id,
      chofer_id,
      // Solo si cambió (así no se pierden los segundos de la hora original)
      ...(cambioFecha ? { registrado_en: fecha.toISOString() } : {}),
      tipo_combustible_id,
      estacion_id,
      estacion,
      odometro_km,
      litros,
      costo_total: total,
      precio_litro,
      tanque_lleno,
      notas,
    })
    .eq("id", id);

  if (error) {
    // No quedó editada: no dejar un historial de algo que no pasó
    await supabase
      .from("cargas_correcciones")
      .delete()
      .in(
        "id",
        (registradas || []).map((r: any) => r.id),
      );
    return { error: "No se pudo guardar: " + error.message };
  }

  revalidatePath("/historial");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  return {
    success:
      cambios.length === 1
        ? "Carga corregida (1 dato)."
        : `Carga corregida (${cambios.length} datos).`,
  };
}
