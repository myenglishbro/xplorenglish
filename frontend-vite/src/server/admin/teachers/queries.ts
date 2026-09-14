import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { TeacherListItem } from "./types";

type Client = SupabaseClient<Database>;

interface TeacherProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  teacher_profile: { hourly_rate: number; status: string } | null;
}

/**
 * 2 round-trips fijos, sin importar cuántos docentes haya -- nunca una query/lookup por fila:
 * 1) profiles + teacher_profiles (embed) filtrando role='teacher';
 * 2) classroom_teachers activos de esos IDs en una sola llamada (.in), conteo agregado en memoria.
 * El email (que solo vive en auth.users, no en profiles) NO se resuelve aquí -- requiere
 * auth.admin.listUsers(), que exige service_role y por lo tanto solo puede vivir en el backend
 * Next (GET /api/admin/users/emails). El caller debe pedir ese endpoint por separado y pasar el
 * Map resultante en `emailById`.
 */
export async function listTeachers(supabase: Client, emailById: Map<string, string | null>): Promise<TeacherListItem[]> {
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, status, teacher_profile:teacher_profiles!teacher_profiles_profile_id_fkey(hourly_rate, status)")
    .eq("role", "teacher")
    .order("first_name", { ascending: true })
    .returns<TeacherProfileRow[]>();

  if (error) throw error;
  if (rows.length === 0) return [];

  const teacherIds = rows.map((r) => r.id);

  const { data: assignments, error: assignError } = await supabase
    .from("classroom_teachers")
    .select("teacher_id")
    .eq("status", "active")
    .in("teacher_id", teacherIds);

  if (assignError) throw assignError;

  const countByTeacher = new Map<string, number>();
  for (const a of assignments) {
    countByTeacher.set(a.teacher_id, (countByTeacher.get(a.teacher_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: emailById.get(r.id) ?? null,
    phone: r.phone,
    hourlyRate: r.teacher_profile?.hourly_rate ?? 0,
    teacherStatus: (r.teacher_profile?.status as "active" | "inactive" | undefined) ?? "inactive",
    accountStatus: r.status,
    activeClassroomCount: countByTeacher.get(r.id) ?? 0,
  }));
}
