import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AttendanceRosterItem,
  ClassroomOption,
  ClassScheduleItem,
  SessionDetail,
  SessionListItem,
  SessionTeacherChangeItem,
} from "./types";

type Client = SupabaseClient<Database>;

/**
 * `scheduled_teacher_id`/`actual_teacher_id` (sessions) y `previous_teacher_id`/`new_teacher_id`
 * (session_teacher_changes) referencian `teacher_profiles(profile_id)`, que a su vez ES
 * `profiles(id)` (0003: `teacher_profiles.profile_id` es PK Y FK a `profiles.id`, mismo valor de
 * UUID) -- así que resolver nombres es un batch fetch directo a `profiles` por esos mismos ids,
 * sin necesidad de pasar por `teacher_profiles` ni de un embed anidado de dos saltos. Mismo
 * principio que `fetchProfileNames` en `server/admin/classrooms/queries.ts`.
 */
async function fetchProfileNames(supabase: Client, ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").in("id", uniqueIds);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
}

interface SessionRow {
  id: number;
  classroom_id: number;
  scheduled_teacher_id: string;
  actual_teacher_id: string | null;
  actual_start: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: Database["public"]["Enums"]["session_status"];
  rescheduled_from_session_id: number | null;
  classroom: { name: string } | null;
}

const SESSION_SELECT = `
  id, classroom_id, scheduled_teacher_id, actual_teacher_id, actual_start, scheduled_start, scheduled_end,
  status, rescheduled_from_session_id,
  classroom:classrooms(name)
`;

async function mapSessionRows(supabase: Client, rows: SessionRow[]): Promise<SessionListItem[]> {
  const teacherIds = rows.flatMap((r) => [r.scheduled_teacher_id, r.actual_teacher_id].filter((id): id is string => !!id));
  const names = await fetchProfileNames(supabase, teacherIds);

  return rows.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    classroomName: row.classroom?.name ?? "Salón sin nombre",
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    scheduledTeacherId: row.scheduled_teacher_id,
    scheduledTeacherName: names.get(row.scheduled_teacher_id) ?? "Docente",
    actualTeacherId: row.actual_teacher_id,
    actualTeacherName: row.actual_teacher_id ? (names.get(row.actual_teacher_id) ?? "Docente") : null,
    actualStart: row.actual_start,
    status: row.status,
    rescheduledFromSessionId: row.rescheduled_from_session_id,
  }));
}

export async function getWeekSessions(
  supabase: Client,
  params: { weekStart: Date; weekEnd: Date; classroomId?: number; teacherId?: string }
): Promise<SessionListItem[]> {
  let query = supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .gte("scheduled_start", params.weekStart.toISOString())
    .lt("scheduled_start", params.weekEnd.toISOString())
    .order("scheduled_start", { ascending: true });

  if (params.classroomId) query = query.eq("classroom_id", params.classroomId);
  if (params.teacherId) query = query.or(`scheduled_teacher_id.eq.${params.teacherId},actual_teacher_id.eq.${params.teacherId}`);

  const { data, error } = await query.returns<SessionRow[]>();
  if (error) throw error;

  return mapSessionRows(supabase, data);
}

interface TeacherChangeRow {
  id: number;
  change_type: Database["public"]["Enums"]["session_teacher_change_type"];
  previous_teacher_id: string | null;
  new_teacher_id: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

export async function getSessionDetail(supabase: Client, sessionId: number): Promise<SessionDetail | null> {
  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .select(`${SESSION_SELECT}, notes, actual_end`)
    .eq("id", sessionId)
    .maybeSingle()
    .returns<(SessionRow & { notes: string | null; actual_end: string | null }) | null>();

  if (sessionError) throw sessionError;
  if (!sessionRow) return null;

  const [{ data: childRow, error: childError }, { data: changeRows, error: changesError }] = await Promise.all([
    supabase.from("sessions").select("id").eq("rescheduled_from_session_id", sessionId).maybeSingle(),
    supabase
      .from("session_teacher_changes")
      .select("id, change_type, previous_teacher_id, new_teacher_id, changed_by, changed_at, reason")
      .eq("session_id", sessionId)
      .order("changed_at", { ascending: false })
      .returns<TeacherChangeRow[]>(),
  ]);

  if (childError) throw childError;
  if (changesError) throw changesError;

  const nameIds = changeRows.flatMap((r) => [r.previous_teacher_id, r.new_teacher_id, r.changed_by].filter((id): id is string => !!id));
  const names = await fetchProfileNames(
    supabase,
    [...nameIds, sessionRow.scheduled_teacher_id, sessionRow.actual_teacher_id].filter((id): id is string => !!id)
  );

  const teacherChanges: SessionTeacherChangeItem[] = changeRows.map((row) => ({
    id: row.id,
    changeType: row.change_type,
    previousTeacherName: row.previous_teacher_id ? (names.get(row.previous_teacher_id) ?? "Docente") : null,
    newTeacherName: names.get(row.new_teacher_id) ?? "Docente",
    changedByName: names.get(row.changed_by) ?? "—",
    changedAt: row.changed_at,
    reason: row.reason,
  }));

  return {
    id: sessionRow.id,
    classroomId: sessionRow.classroom_id,
    classroomName: sessionRow.classroom?.name ?? "Salón sin nombre",
    scheduledStart: sessionRow.scheduled_start,
    scheduledEnd: sessionRow.scheduled_end,
    scheduledTeacherId: sessionRow.scheduled_teacher_id,
    scheduledTeacherName: names.get(sessionRow.scheduled_teacher_id) ?? "Docente",
    actualTeacherId: sessionRow.actual_teacher_id,
    actualTeacherName: sessionRow.actual_teacher_id ? (names.get(sessionRow.actual_teacher_id) ?? "Docente") : null,
    status: sessionRow.status,
    rescheduledFromSessionId: sessionRow.rescheduled_from_session_id,
    notes: sessionRow.notes,
    actualStart: sessionRow.actual_start,
    actualEnd: sessionRow.actual_end,
    rescheduledToSessionId: childRow?.id ?? null,
    teacherChanges,
  };
}

/**
 * Próximas (scheduled, desde ahora) + pasadas (todo lo demás: completadas, canceladas,
 * reprogramadas, o scheduled cuyo horario ya pasó) -- RLS (sessions_select, 0006) ya acota a las
 * sesiones visibles para el caller (docente: las suyas + las de sus salones; estudiante: las de
 * sus salones), esta función no filtra por persona, solo por tiempo/estado.
 */
export async function getRoleSessions(supabase: Client, now: Date): Promise<{ upcoming: SessionListItem[]; past: SessionListItem[] }> {
  const nowIso = now.toISOString();

  const [{ data: upcomingRows, error: upcomingError }, { data: pastRows, error: pastError }] = await Promise.all([
    supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("status", "scheduled")
      .gte("scheduled_start", nowIso)
      .order("scheduled_start", { ascending: true })
      .returns<SessionRow[]>(),
    supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .or(`status.neq.scheduled,scheduled_start.lt.${nowIso}`)
      .order("scheduled_start", { ascending: false })
      .limit(30)
      .returns<SessionRow[]>(),
  ]);

  if (upcomingError) throw upcomingError;
  if (pastError) throw pastError;

  const [upcoming, past] = await Promise.all([mapSessionRows(supabase, upcomingRows), mapSessionRows(supabase, pastRows)]);
  return { upcoming, past };
}

/** Todos los class_schedules de todos los salones (activos e inactivos) -- volumen esperado bajo
 * en este MVP (un puñado de filas por salón), se filtra por salón en el cliente en vez de traer
 * uno por uno cada vez que el admin cambia de salón en el modal de horarios. */
export async function getAllClassSchedules(supabase: Client): Promise<ClassScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .order("classroom_id", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isActive: row.is_active,
  }));
}

export async function getClassSchedules(supabase: Client, classroomId: number): Promise<ClassScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .eq("classroom_id", classroomId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isActive: row.is_active,
  }));
}

/** Único PRIMARY activo del salón (garantizado por índice único parcial, 0005) -- default
 * sensato para scheduled_teacher_id al crear/generar sesiones. null si el salón todavía no tiene
 * titular. */
export async function getActivePrimaryTeacherId(supabase: Client, classroomId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("classroom_teachers")
    .select("teacher_id")
    .eq("classroom_id", classroomId)
    .eq("teacher_role", "PRIMARY")
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data?.teacher_id ?? null;
}

export async function getClassroomOptions(supabase: Client): Promise<ClassroomOption[]> {
  const { data, error } = await supabase.from("classrooms").select("id, name").eq("status", "active").order("name", { ascending: true });
  if (error) throw error;
  return data;
}

interface AttendanceRow {
  id: number;
  student_id: string;
  status: Database["public"]["Enums"]["attendance_status"];
  minutes_charged: number | null;
  decided_at: string | null;
  student: { first_name: string; last_name: string } | null;
  decided_by_profile: { first_name: string; last_name: string } | null;
}

/**
 * Roster de asistencia de una sesión -- vacío si initialize_session_attendance todavía no corrió
 * para esta sesión (estado válido, no un error). A diferencia de scheduled_teacher_id/actual_teacher_id
 * (que van a través de teacher_profiles), `student_id` y `decided_by` en `session_attendance`
 * referencian `profiles(id)` DIRECTAMENTE (0006) -- un embed de un solo salto, sin el rodeo por
 * profiles que sí hace falta para nombres de docente.
 */
export async function getSessionAttendanceRoster(supabase: Client, sessionId: number): Promise<AttendanceRosterItem[]> {
  const { data, error } = await supabase
    .from("session_attendance")
    .select(
      `
      id, student_id, status, minutes_charged, decided_at,
      student:profiles!session_attendance_student_id_fkey(first_name,last_name),
      decided_by_profile:profiles!session_attendance_decided_by_fkey(first_name,last_name)
    `
    )
    .eq("session_id", sessionId)
    .returns<AttendanceRow[]>();

  if (error) throw error;

  return data
    .map((row) => ({
      attendanceId: row.id,
      studentId: row.student_id,
      studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "Estudiante",
      status: row.status,
      minutesCharged: row.minutes_charged,
      decidedByName: row.decided_by_profile ? `${row.decided_by_profile.first_name} ${row.decided_by_profile.last_name}` : null,
      decidedAt: row.decided_at,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** classroomId -> PRIMARY activo, para prellenar el docente al crear una sesión individual o al
 * generar desde class_schedules -- un solo query para todos los salones en vez de uno por salón
 * (garantizado a lo sumo un PRIMARY activo por salón, índice único parcial en 0005). */
export async function getPrimaryTeacherByClassroom(supabase: Client): Promise<Record<number, string>> {
  const { data, error } = await supabase
    .from("classroom_teachers")
    .select("classroom_id, teacher_id")
    .eq("teacher_role", "PRIMARY")
    .eq("status", "active");
  if (error) throw error;

  const map: Record<number, string> = {};
  for (const row of data) map[row.classroom_id] = row.teacher_id;
  return map;
}
