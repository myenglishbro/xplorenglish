import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getClassroomPeople } from "@/features/classroomOverview/api";
import type { MyTeacherScheduleBlock } from "./types";

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
 * Horario semanal REFERENCIAL (class_schedules, nunca class_records) del docente autenticado --
 * SIEMPRE self-scoped: `teacherId` viene de useAuth().user.id en el único caller (features/
 * classrooms/hooks.ts), nunca de la UI. Mismo criterio de "vigente" que el resto del proyecto
 * (getWeeklyAgenda, FIX 3): classroom_teachers.status='active', classrooms.status='active',
 * class_schedules.is_active=true. RLS (class_schedules_select -> can_access_classroom ->
 * is_classroom_teacher, ya exige exactamente esos dos primeros criterios) es la autoridad real;
 * el filtro por classroomIds acá es además una defensa explícita/optimización, no un reemplazo.
 *
 * NOMBRE DEL ALUMNO (fix post-validación manual, FIX 7): profiles_select (0003) es deliberadamente
 * "solo tu propia fila, o admin" -- un docente NO puede leer profiles.first_name/last_name de su
 * alumno con un SELECT directo, ni siquiera vía embed (RLS también aplica a relaciones embebidas de
 * PostgREST). Por eso NO se resuelve student_id -> profiles acá: se reutiliza get_classroom_people
 * (RPC SECURITY DEFINER, 0032_classroom_people.sql), el mecanismo YA existente y ya autorizado del
 * proyecto para exactamente este cruce de roles (mismo que usa el detalle de salón, ver
 * features/classroomOverview/api.ts). Se llama una vez POR SALÓN (nunca por bloque horario) y en
 * paralelo -- acotado al número de salones del docente, no al número de horarios.
 */
export async function getMyWeeklyScheduleAsTeacher(supabase: Client, teacherId: string): Promise<MyTeacherScheduleBlock[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("classroom_teachers")
    .select("classroom_id")
    .eq("teacher_id", teacherId)
    .eq("status", "active");
  if (membershipsError) throw membershipsError;
  if (memberships.length === 0) return [];

  const classroomIds = [...new Set(memberships.map((m) => m.classroom_id))];

  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, classroom:classrooms!inner(name)")
    .eq("is_active", true)
    .eq("classrooms.status", "active")
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
    studentName: peopleByClassroom.get(row.classroom_id)?.studentName ?? null,
  }));
}
