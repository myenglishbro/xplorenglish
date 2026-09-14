import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Equivalente de requireRole("admin") para Route Handlers autenticados por Bearer (SPA Vite) en
 * vez de cookies -- el rol se verifica contra profiles.role del usuario YA autenticado por
 * authenticateBearer() (auth.getUser() real), nunca contra nada que el cliente mande. Mismo
 * criterio que usaba el guard equivalente de teacher/availability antes de que esa mutación se
 * migrara a Supabase RPC directo (ver 0021_teacher_availability_self_service.sql).
 */
export async function requireAdminBearer(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status: 403 }> {
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error || !profile) {
    return { ok: false, error: "No pudimos verificar tu perfil.", status: 403 };
  }
  if (profile.role !== "admin") {
    return { ok: false, error: "Esta operación es exclusiva para administradores.", status: 403 };
  }

  return { ok: true };
}
