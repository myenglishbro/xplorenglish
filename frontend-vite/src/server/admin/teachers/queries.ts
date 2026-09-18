import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AvailabilityBlockItem } from "@/features/availability/types";
import type { TeacherListItem, TeacherProfileStatus } from "./types";

type Client = SupabaseClient<Database>;

interface RawTeacherProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  teacher_profile: { hourly_rate: number; status: string } | null;
}

/** Todo lo que sale de `profiles`/`teacher_profiles` para el listado -- sin email (auth.users,
 * fuera de Postgres/RLS) ni conteo de salones (otra tabla): esas dos partes se piden aparte, EN
 * PARALELO, una vez que quien llama ya tiene los ids de acá (ver useTeachers, performance slice 2).
 * Separarlo en su propia función es justo lo que permite ese paralelismo -- antes vivían
 * encadenadas dentro de un solo listTeachers(). */
export interface TeacherProfileListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  hourlyRate: number;
  teacherStatus: TeacherProfileStatus;
  accountStatus: string;
}

export async function listTeacherProfiles(supabase: Client): Promise<TeacherProfileListItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, status, teacher_profile:teacher_profiles!teacher_profiles_profile_id_fkey(hourly_rate, status)")
    .eq("role", "teacher")
    .order("first_name", { ascending: true })
    .returns<RawTeacherProfileRow[]>();

  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    hourlyRate: r.teacher_profile?.hourly_rate ?? 0,
    teacherStatus: (r.teacher_profile?.status as TeacherProfileStatus | undefined) ?? "inactive",
    accountStatus: r.status,
  }));
}

/** classroom_teachers activos de esos ids en una sola llamada (.in), conteo agregado en memoria --
 * nunca 1 query por docente. Independiente de la resolución de emails: ambas pueden pedirse en
 * paralelo una vez que se conocen los ids (ver useTeachers). */
export async function getActiveClassroomCounts(supabase: Client, teacherIds: string[]): Promise<Map<string, number>> {
  if (teacherIds.length === 0) return new Map();

  const { data, error } = await supabase.from("classroom_teachers").select("teacher_id").eq("status", "active").in("teacher_id", teacherIds);

  if (error) throw error;

  const countByTeacher = new Map<string, number>();
  for (const a of data) {
    countByTeacher.set(a.teacher_id, (countByTeacher.get(a.teacher_id) ?? 0) + 1);
  }
  return countByTeacher;
}

/**
 * Disponibilidad semanal de un lote de docentes en una sola query (RLS teacher_availability_owner
 * ya permite lectura total a Admin, 0003 -- misma fuente de verdad que "Mi disponibilidad" del
 * docente). Usado por Ajuste 1 (recomendación al configurar salón) y Ajuste 5 (Admin > Docentes >
 * Ver disponibilidad, con un solo id).
 */
export async function getTeacherAvailabilityByIds(
  supabase: Client,
  teacherIds: string[]
): Promise<Map<string, AvailabilityBlockItem[]>> {
  const map = new Map<string, AvailabilityBlockItem[]>();
  if (teacherIds.length === 0) return map;

  const { data, error } = await supabase
    .from("teacher_availability")
    .select("id, teacher_id, day_of_week, start_time, end_time, timezone")
    .in("teacher_id", teacherIds)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  for (const row of data) {
    const list = map.get(row.teacher_id) ?? [];
    list.push({ id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time, timezone: row.timezone });
    map.set(row.teacher_id, list);
  }
  return map;
}

/** La vista general pagina los bloques para no truncar la semana al límite de filas de PostgREST. */
export async function getAllTeacherAvailabilityByIds(
  supabase: Client,
  teacherIds: string[]
): Promise<Map<string, AvailabilityBlockItem[]>> {
  const map = new Map<string, AvailabilityBlockItem[]>();
  if (teacherIds.length === 0) return map;

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("teacher_availability")
      .select("id, teacher_id, day_of_week, start_time, end_time, timezone")
      .in("teacher_id", teacherIds)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    for (const row of data) {
      const list = map.get(row.teacher_id) ?? [];
      list.push({ id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time, timezone: row.timezone });
      map.set(row.teacher_id, list);
    }
    if (data.length < pageSize) break;
  }
  return map;
}

/**
 * Nombres de skill (niveles/programas) de un lote de docentes (RLS teacher_skills_owner ya
 * permite lectura total a Admin, 0003). Mismos ids de `skills` que `academic_level` para A1..C2,
 * lo que permite comparar contra classrooms.level directamente por texto.
 */
export async function getTeacherSkillNamesByIds(supabase: Client, teacherIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (teacherIds.length === 0) return map;

  const { data, error } = await supabase
    .from("teacher_skills")
    .select("teacher_id, skill:skills(name)")
    .in("teacher_id", teacherIds);

  if (error) throw error;

  for (const row of data) {
    if (!row.skill) continue;
    const list = map.get(row.teacher_id) ?? [];
    list.push(row.skill.name);
    map.set(row.teacher_id, list);
  }
  return map;
}

/** Combina lo ya resuelto por listTeacherProfiles + getActiveClassroomCounts + el Map de emails
 * (resuelto aparte, vía RPC get_user_emails -- ver useTeachers) en el shape final de fila.
 * Pura, sin red: separada así para que el orden real de fetch (profiles -> Promise.all(counts,
 * emails) -> merge) quede explícito en el hook, no escondido dentro de una sola función. */
export function toTeacherListItem(
  profile: TeacherProfileListItem,
  countByTeacher: Map<string, number>,
  emailById: Map<string, string | null>
): TeacherListItem {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: emailById.get(profile.id) ?? null,
    phone: profile.phone,
    hourlyRate: profile.hourlyRate,
    teacherStatus: profile.teacherStatus,
    accountStatus: profile.accountStatus,
    activeClassroomCount: countByTeacher.get(profile.id) ?? 0,
  };
}
