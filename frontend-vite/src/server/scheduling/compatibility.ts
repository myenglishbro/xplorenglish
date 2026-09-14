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

/** Regla de overlap pedida explícitamente: newStart < existingEnd && newEnd > existingStart,
 * mismo día de semana. Adyacente (fin de uno = inicio del otro) NO es conflicto. */
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
 * Compatibilidad de CADA docente activo contra TODOS los class_schedules activos del salón.
 * "Ocupado" tiene DOS fuentes, ambas revisadas (MVP final: asignación de docentes según
 * disponibilidad y conflictos) -- nunca una segunda fuente de verdad inventada, ambas ya
 * existían por separado en el modelo:
 *  1) class_schedules activos de OTROS salones donde este docente es PRIMARY activo -- el
 *     compromiso semanal recurrente, exista o no todavía una sesión concreta generada a partir
 *     de él (GenerateSessionsButton es un paso aparte, manual).
 *  2) sessions 'scheduled' futuras de este docente en otro salón -- ya existía antes de este
 *     bloque (revalidación server-side de assignPrimaryTeacherAction en el Next original).
 * El salón que se está editando se excluye explícitamente de ambas fuentes (`neq classroom_id`)
 * para que un docente no entre en conflicto consigo mismo al reconfirmar su propio salón.
 *
 * Sin importar cuántos docentes existan: nunca 1 query por docente (batch fijo, ~5 round-trips
 * como máximo, 2 de ellos solo si el docente candidato ya es PRIMARY de algún otro salón).
 * Prioridad cuando concurren varias razones: sin disponibilidad > fuera de disponibilidad >
 * conflicto -- reflejada en el orden de los `if` de abajo. Reutilizada tal cual tanto para pintar
 * el selector de PRIMARY como, en useAssignPrimaryTeacher, para revalidar justo antes de llamar al
 * RPC (nunca se confía en el estado "compatible" que pudo haber calculado el cliente antes) --
 * ver el hallazgo de seguridad en el informe: esta revalidación sigue siendo client-side, el RPC
 * assign_classroom_primary_teacher en sí no valida disponibilidad/conflicto.
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

  const [
    { data: availabilityRows, error: availabilityError },
    { data: sessionRows, error: sessionsError },
    { data: otherPrimaryRows, error: otherPrimaryError },
  ] = await Promise.all([
    supabase.from("teacher_availability").select("teacher_id, day_of_week, start_time, end_time").in("teacher_id", teacherIds),
    supabase
      .from("sessions")
      .select("scheduled_teacher_id, scheduled_start, scheduled_end")
      .eq("status", "scheduled")
      .neq("classroom_id", classroomId)
      .gte("scheduled_start", new Date().toISOString())
      .in("scheduled_teacher_id", teacherIds),
    supabase
      .from("classroom_teachers")
      .select("teacher_id, classroom_id")
      .eq("teacher_role", "PRIMARY")
      .eq("status", "active")
      .neq("classroom_id", classroomId)
      .in("teacher_id", teacherIds),
  ]);

  if (availabilityError) throw availabilityError;
  if (sessionsError) throw sessionsError;
  if (otherPrimaryError) throw otherPrimaryError;

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

  // Horarios semanales de OTROS salones donde cada docente candidato ya es PRIMARY activo --
  // batch de 1 query adicional (solo si hay al menos una fila), nunca una por salón/docente.
  const otherClassroomIds = [...new Set(otherPrimaryRows.map((r) => r.classroom_id))];
  const schedulesByClassroom = new Map<number, AvailabilityBlock[]>();
  if (otherClassroomIds.length > 0) {
    const { data: otherScheduleRows, error: otherSchedulesError } = await supabase
      .from("class_schedules")
      .select("classroom_id, day_of_week, start_time, end_time")
      .eq("is_active", true)
      .in("classroom_id", otherClassroomIds);
    if (otherSchedulesError) throw otherSchedulesError;

    for (const row of otherScheduleRows) {
      const list = schedulesByClassroom.get(row.classroom_id) ?? [];
      list.push({ dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5) });
      schedulesByClassroom.set(row.classroom_id, list);
    }
  }

  const occupiedByTeacher = new Map<string, AvailabilityBlock[]>();
  for (const row of otherPrimaryRows) {
    const blocks = schedulesByClassroom.get(row.classroom_id) ?? [];
    if (blocks.length === 0) continue;
    const list = occupiedByTeacher.get(row.teacher_id) ?? [];
    list.push(...blocks);
    occupiedByTeacher.set(row.teacher_id, list);
  }

  const teachers: TeacherCompatibilityItem[] = activeTeachers.map((teacher) => {
    const availability = availabilityByTeacher.get(teacher.id) ?? [];
    const sessions = sessionsByTeacher.get(teacher.id) ?? [];
    const occupiedSchedules = occupiedByTeacher.get(teacher.id) ?? [];

    // Normaliza cada schedule a HH:MM (sin segundos) UNA vez -- mismo formato exacto que
    // occupiedSchedules/sessions, ambos ya vienen sliced desde su construcción arriba. Comparar
    // strings de distinto ancho ("17:00" vs "17:00:00") rompería la regla de overlap en los
    // bordes exactos (Caso D, adyacente).
    const normalizedSchedules = schedules.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) }));
    const hasScheduleConflict = normalizedSchedules.some((schedule) => occupiedSchedules.some((block) => overlaps(block, schedule)));
    const hasSessionConflict = normalizedSchedules.some((schedule) => sessions.some((session) => overlaps(session, schedule)));

    let status: TeacherCompatibilityStatus;
    if (availability.length === 0) {
      status = "no_availability";
    } else if (!schedules.every((schedule) => coversSchedule(schedule, availability))) {
      status = "out_of_availability";
    } else if (hasScheduleConflict || hasSessionConflict) {
      status = "conflict";
    } else {
      status = "compatible";
    }

    return { teacherId: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, status };
  });

  return { hasActiveSchedules: true, schedules, teachers };
}
