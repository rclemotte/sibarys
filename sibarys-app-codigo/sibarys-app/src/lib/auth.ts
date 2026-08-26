// La cédula se convierte en un email "de sistema" para Supabase Auth.
// El usuario nunca ve este email: solo escribe su cédula.
export const DOMINIO_CEDULA = "sibarys.app";

/** Deja solo los dígitos de la cédula (ignora puntos, guiones, espacios). */
export function normalizarCedula(entrada: string): string {
  return (entrada || "").replace(/\D/g, "");
}

/**
 * Convierte lo que el usuario escribe en el email para Supabase.
 * - Si escribió un email real (contiene "@"), lo usa tal cual
 *   (compatibilidad para el admin que se creó con email).
 * - Si escribió una cédula, la transforma en cedula@sibarys.app.
 */
export function cedulaAEmail(entrada: string): string {
  const v = (entrada || "").trim();
  if (v.includes("@")) return v.toLowerCase();
  return `${normalizarCedula(v)}@${DOMINIO_CEDULA}`;
}
