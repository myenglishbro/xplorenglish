import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase "as user" para Route Handlers llamados desde un origen externo (el SPA Vite),
 * donde no hay cookies que leer -- la sesión viaja como `Authorization: Bearer <access_token>`.
 *
 * Usa la ANON key (nunca service_role) + ese Bearer como header global: PostgREST y GoTrue ven
 * exactamente el mismo JWT que verían si la request viniera del propio Next con cookies, así que
 * RLS (auth.uid()) sigue siendo la autoridad real sobre cualquier query hecha con este cliente --
 * es el mismo mecanismo que @supabase/ssr usa internamente, solo que el JWT llega por header en
 * vez de por cookie.
 */
function createBearerClient(accessToken: string): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type BearerAuthResult = { ok: true; userId: string; supabase: SupabaseClient<Database> } | { ok: false; status: 401; error: string };

/**
 * Extrae el Bearer del header Authorization y lo verifica REALMENTE contra el servidor de
 * Supabase Auth -- auth.getUser(token), NUNCA decodificar el JWT localmente ni confiar en su
 * payload sin verificar. Mismo criterio que getAuthUser() en lib/auth/session.ts (auth.getUser(),
 * nunca getSession(), para decisiones de autorización), adaptado a transporte por header en vez
 * de cookie.
 */
export async function authenticateBearer(request: Request): Promise<BearerAuthResult> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return { ok: false, status: 401, error: "Falta el header Authorization: Bearer <access_token>." };
  }

  const supabase = createBearerClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, status: 401, error: "Sesión inválida o expirada." };
  }

  return { ok: true, userId: data.user.id, supabase };
}
