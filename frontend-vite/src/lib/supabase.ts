import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configuradas (.env.local).");
}

/**
 * Cliente único para todo el SPA. Sesión persistida en localStorage (comportamiento default de
 * supabase-js) -- no hace falta el manejo de cookies de @supabase/ssr porque no hay ningún
 * servidor propio que necesite leer la sesión (el Route Handler seguro recibe el access_token
 * explícito por header, no por cookie -- ver features/availability/api.ts).
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
