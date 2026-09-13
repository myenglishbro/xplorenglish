import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getLimaWeekday, toLimaDateTimeInputValues } from "@/lib/datetime/lima";
import { listAssignableTeachers } from "@/server/admin/classrooms/queries";
import { getClassSchedules } from "./queries";
import type { ClassScheduleItem } from "./types";
import type { TeacherCompatibilityItem, TeacherCompatibilityStatus } from "./types";

type Client = SupabaseClient<Database>;

interface AvailabilityBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface SessionBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function overlaps(a: SessionBlock, b: { dayOfWeek: number; startTime: string; endTime: string }): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && a.endTime > b.startTime;
}

/**
 * Un docente "cubre" un class_schedule si tiene al menos un bloque de teacher_availability del
 * MISMO day_of_week cuyo [start_time, end_time] contiene por completo al del salón -- exactamente
 * la regla pedida: availability.start_time <= schedule.start_time Y availability.end_time >=
 * schedule.end_time. Comparación por string "HH:MM" -- seguro porque ambas columnas son `time`
 * con minutos exactos (timeString regex en validation.ts nunca admite segundos), formato de ancho
 * fijo zero-padded.
 */
function coversSchedule(schedule: ClassScheduleItem, availability: AvailabilityBlock[]): boolean {
  const schedStart = schedule.startTime.slice(0, 5);
  const schedEnd = schedule.endTime.slice(0, 5);
  return availability.some(
    (a) => a.dayOfWeek === schedule.dayOfWeek && a.startTime <= schedStart && a.endTime >= schedEnd
  );
}

export interface ClassroomCompatibilityResult {
  /** false => el salón no tiene ningún class_schedule activo; no se intentó calcular
   * compatibilidad (ver server/scheduling/compatibility.ts, punto 6 del bloque). `teachers` viene
   * vacío en ese caso -- el caller no debe ofrecer selección de PRIMARY basada en disponibilidad. */
  hasActiveSchedules: boolean;
  schedules: ClassScheduleItem[];
  teachers: TeacherCompatibilityItem[];
}

/**
 * Compatibilidad de CADA docente activo contra TODOS los class_schedules activos del salón --
 * batch de 4 queries fijas (schedules, docentes activos, disponibilidad de esos docentes,
 * sesiones 'scheduled' de esos docentes), sin importar cuántos docentes existan: nunca 1 query
 * por docente. Prioridad cuando concurren varias razones (pedida explícitamente): sin
 * disponibilidad > fuera de disponibilidad > conflicto -- reflejada en el orden de los `if` de
 * abajo. Reutilizada tal cual tanto para pintar el selector de PRIMARY como, en
 * assignPrimaryTeacherAction, para revalidar en servidor antes de escribir (nunca se confía en el
 * estado "compatible" que pudo haber calculado el cliente).
 */
export async function getClassroomTeacherCompatibility(supabase: Client, classroomId: number): Promise<ClassroomCompatibilityResult> {
  const allSchedules = await getClassSchedules(supabase, classroomId);
  const schedules = allSchedules.filter((s) => s.isActive);

  if (schedules.length === 0) {
    return { hasActiveSchedules: false, schedules: [], teachers: [] };
  }

  const activeTeachers = await listAssignableTeachers(supabase);
  if (activeTeachers.length === 0) {
    return { hasActiveSchedules: true, schedules, teachers: [] };
  }

  const teacherIds = activeTeachers.map((t) => t.id);

  const [{ data: availabilityRows, error: availabilityError }, { data: sessionRows, error: sessionsError }] = await Promise.all([
    supabase.from("teacher_availability").select("teacher_id, day_of_week, start_time, end_time").in("teacher_id", teacherIds),
    supabase
      .from("sessions")
      .select("scheduled_teacher_id, scheduled_start, scheduled_end")
      .eq("status", "scheduled")
      .neq("classroom_id", classroomId)
      .gte("scheduled_start", new Date().toISOString())
      .in("scheduled_teacher_id", teacherIds),
  ]);

  if (availabilityError) throw availabilityError;
  if (sessionsError) throw sessionsError;

  const availabilityByTeacher = new Map<string, AvailabilityBlock[]>();
  for (const row of availabilityRows) {
    const list = availabilityByTeacher.get(row.teacher_id) ?? [];
    list.push({ dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5) });
    availabilityByTeacher.set(row.teacher_id, list);
  }

  const sessionsByTeacher = new Map<string, SessionBlock[]>();
  for (const row of sessionRows) {
    const list = sessionsByTeacher.get(row.scheduled_teacher_id) ?? [];
    list.push({
      dayOfWeek: getLimaWeekday(new Date(row.scheduled_start)),
      startTime: toLimaDateTimeInputValues(row.scheduled_start).time,
      endTime: toLimaDateTimeInputValues(row.scheduled_end).time,
    });
    sessionsByTeacher.set(row.scheduled_teacher_id, list);
  }

  const teachers: TeacherCompatibilityItem[] = activeTeachers.map((teacher) => {
    const availability = availabilityByTeacher.get(teacher.id) ?? [];
    const sessions = sessionsByTeacher.get(teacher.id) ?? [];

    let status: TeacherCompatibilityStatus;
    if (availability.length === 0) {
      status = "no_availability";
    } else if (!schedules.every((schedule) => coversSchedule(schedule, availability))) {
      status = "out_of_availability";
    } else if (schedules.some((schedule) => sessions.some((session) => overlaps(session, { dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime.slice(0, 5), endTime: schedule.endTime.slice(0, 5) })))) {
      status = "conflict";
    } else {
      status = "compatible";
    }

    return { teacherId: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, status };
  });

  return { hasActiveSchedules: true, schedules, teachers };
}
