import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente con la service_role key -- SOLO para operaciones del Admin API de Supabase Auth
 * (auth.admin.createUser / auth.admin.deleteUser / auth.admin.updateUserById) que no tienen
 * ningún equivalente bajo RLS, porque crear, borrar o cambiarle la contraseña a una identidad de
 * Auth ajena no es algo que ninguna sesión autenticada normal pueda hacer. Nunca se usa para leer
 * ni escribir datos de negocio: eso sigue yendo por createClient() de ./server.ts, con la sesión
 * real del caller, para que RLS siga siendo la autorización real.
 *
 * El import "server-only" hace que el build falle si este módulo terminara importado, directa
 * o indirectamente, desde un Client Component.
 *
 * El cliente se construye de forma perezosa (dentro de una función, no en module scope): si
 * SUPABASE_SERVICE_ROLE_KEY todavía no está configurada, `next build` no debe romperse solo por
 * importar este archivo -- el error real aparece recién cuando una Server Action de verdad
 * invoca createAdminClient() en tiempo de request.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurada.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno del servidor. Este valor nunca debe llevar el prefijo NEXT_PUBLIC_."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
