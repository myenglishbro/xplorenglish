import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getClassroomPeople } from "@/features/classroomOverview/api";
import type { MyStudentScheduleBlock } from "./types";

type Client = SupabaseClient<Database>;

interface ScheduleRow {
  id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom: { name: string } | null;
}

/**
 * Horario semanal REFERENCIAL (class_schedules, nunca class_records) del alumno autenticado --
 * SIEMPRE self-scoped: `studentId` viene de useAuth().user.id en el único caller (features/
 * classrooms/hooks.ts), nunca de la UI. classrooms.student_id filtra directamente (mismo criterio
 * que listMyClassroomsAsStudent); RLS (class_schedules_select -> can_access_classroom ->
 * is_classroom_student, que ya exige classrooms.status='active') es la autoridad real -- el filtro
 * explícito por classroomIds acá es defensa/optimización, no un reemplazo.
 *
 * NOMBRES DE DOCENTES (fix post-validación manual, FIX 7): igual que del lado Teacher, un alumno NO
 * puede leer profiles.first_name/last_name de sus docentes con un SELECT/embed directo sobre
 * classroom_teachers -> profiles (profiles_select, 0003, es "solo tu propia fila, o admin"). Se
 * reutiliza get_classroom_people (RPC SECURITY DEFINER ya existente/autorizado, 0032_classroom_
 * people.sql -- mismo mecanismo que el detalle de salón), llamado una vez POR SALÓN del alumno
 * (nunca por bloque horario) y en paralelo.
 */
export async function getMyWeeklyScheduleAsStudent(supabase: Client, studentId: string): Promise<MyStudentScheduleBlock[]> {
  const { data: classrooms, error: classroomsError } = await supabase.from("classrooms").select("id, name").eq("student_id", studentId).eq("status", "active");
  if (classroomsError) throw classroomsError;
  if (classrooms.length === 0) return [];

  const classroomIds = classrooms.map((c) => c.id);

  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, classroom:classrooms!inner(name)")
    .eq("is_active", true)
    .in("classroom_id", classroomIds)
    .returns<ScheduleRow[]>();
  if (error) throw error;
  if (data.length === 0) return [];

  const scheduledClassroomIds = [...new Set(data.map((r) => r.classroom_id))];
  const peopleEntries = await Promise.all(scheduledClassroomIds.map(async (id) => [id, await getClassroomPeople(supabase, id)] as const));
  const peopleByClassroom = new Map(peopleEntries);

  return data.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    classroomName: row.classroom?.name ?? "—",
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    teacherNames: (peopleByClassroom.get(row.classroom_id)?.teachers ?? []).map((t) => `${t.firstName} ${t.lastName}`),
  }));
}
