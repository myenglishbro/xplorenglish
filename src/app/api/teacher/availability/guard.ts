import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Equivalente exacto de requireActiveTeacherId() (src/server/teacher/availability/actions.ts),
 * adaptado a un cliente ya autenticado por Bearer (ver lib/supabase/bearer.ts) en vez de por
 * cookies -- no puede reutilizar la función original porque esa depende de requireRole()/
 * createClient() de next/headers. Misma query, mismo criterio de negocio
 * (teacher_profiles.status === 'active'), mismos mensajes.
 */
export async function requireActiveTeacherId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ teacherId: string } | { error: string; status: 403 }> {
  // requireRole("teacher") original verifica profiles.role === 'teacher' ANTES de mirar
  // teacher_profiles.status -- se replica ese mismo orden acá, en vez de asumir que solo un
  // docente real puede tener fila en teacher_profiles.
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (profileError || !profile) {
    return { error: "No pudimos verificar tu perfil.", status: 403 };
  }
  if (profile.role !== "teacher") {
    return { error: "Esta operación es exclusiva para docentes.", status: 403 };
  }

  const { data: teacherProfile, error } = await supabase.from("teacher_profiles").select("status").eq("profile_id", userId).maybeSingle();

  if (error || !teacherProfile) {
    return { error: "No pudimos verificar tu perfil docente. Inténtalo de nuevo en unos minutos.", status: 403 };
  }
  if (teacherProfile.status !== "active") {
    return { error: "Tu perfil docente está inactivo; contacta a un administrador para reactivarlo.", status: 403 };
  }

  return { teacherId: userId };
}
