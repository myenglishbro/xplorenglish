import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { MyTeacherProfile } from "./types";

type Client = SupabaseClient<Database>;

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  teacher_profile: { bio: string | null; hourly_rate: number; status: string } | null;
}

const SELECT = "id, first_name, last_name, dni, phone, teacher_profile:teacher_profiles!teacher_profiles_profile_id_fkey(bio, hourly_rate, status)";

/**
 * profileId siempre viene de auth.getUser() en el caller (page.tsx vía getAuthUser()), nunca de
 * un parámetro público -- RLS (profiles_select / teacher_profiles_select_self, 0003) ya lo
 * acotaría de todos modos a la fila propia, pero esta query no depende solo de eso. El email NO
 * se resuelve acá: vive en auth.users, no en profiles, y el caller ya lo tiene gratis vía el
 * mismo getAuthUser().email -- pedirlo de nuevo acá sería una vuelta redundante (y, peor, la
 * tentación de usar la Admin API para un dato que la sesión ya trae).
 */
export async function getMyTeacherProfile(supabase: Client, profileId: string): Promise<MyTeacherProfile | null> {
  const { data, error } = await supabase.from("profiles").select(SELECT).eq("id", profileId).maybeSingle().returns<Row | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    dni: data.dni,
    phone: data.phone,
    teacherProfile: data.teacher_profile
      ? { bio: data.teacher_profile.bio, hourlyRate: data.teacher_profile.hourly_rate, status: data.teacher_profile.status }
      : null,
  };
}
