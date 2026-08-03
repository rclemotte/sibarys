import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la CLAVE SECRETA (service role / secret key).
 * ⚠️ Solo se puede usar en el servidor (Server Actions / route handlers).
 * NUNCA importar este archivo desde un componente cliente.
 * La clave se lee de SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC),
 * así nunca se envía al navegador.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
