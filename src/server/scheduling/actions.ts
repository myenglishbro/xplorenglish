"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { limaWallClockToUtc } from "@/lib/datetime/lima";
import { classScheduleSchema, createSessionSchema, generateSessionsSchema, rescheduleSchema, changeTeacherSchema, billingSchema } from "./validation";
import { findOverlappingSessions, describeConflicts } from "./conflicts";
import { getActivePrimaryTeacherId, getClassSchedules } from "./queries";
import type { ClassScheduleItem, GeneratedSessionPreviewItem, SchedulingActionState } from "./types";

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** `'CODIGO: mensaje'` -- convención uniforme de los 12 RPC de dominio (0009). Solo se traduce el
 * código a un mensaje amigable; el mensaje original de Postgres nunca se muestra tal cual. */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  SESSION_NOT_FOUND: "La sesión no existe.",
  SESSION_ALREADY_COMPLETED: "No se puede reasignar el docente de una sesión ya completada.",
  TEACHER_NOT_FOUND: "Ese docente no existe.",
  TEACHER_INACTIVE: "Ese docente está inactivo.",
  INVALID_CHANGE_TYPE: "Tipo de cambio no reconocido.",
  INVALID_SESSION_STATUS: "La sesión no está en un estado válido para esta acción.",
  INVALID_TIME_RANGE: "El horario ingresado no es válido.",
  TEACHER_MISMATCH: "La sesión ya fue iniciada por otro docente.",
  MISSING_ACTUAL_TEACHER: "Falta definir el docente que dictó la sesión.",
  INVALID_DURATION: "No pudimos calcular una duración válida para esta sesión.",
  ATTENDANCE_NOT_FOUND: "No existe una fila de asistencia para este estudiante en esta sesión. Genera el roster primero.",
  INVALID_MINUTES: "Los minutos no pueden ser negativos.",
};

/** INSUFFICIENT_BALANCE trae el detalle exacto ("faltan N minutos") en el propio mensaje de
 * Postgres -- se preserva tal cual en vez de un texto genérico, para que admin sepa cuánto ajustar
 * sin adivinar. El resto de los códigos sí usa un mensaje fijo (RPC_ERROR_MESSAGES). */
function parseRpcError(error: { message: string }): string {
  const [codeRaw, ...rest] = error.message.split(":");
  const code = codeRaw?.trim() ?? "";

  if (code === "INSUFFICIENT_BALANCE") {
    const detail = rest.join(":").trim();
    return detail ? detail.charAt(0).toUpperCase() + detail.slice(1) + "." : "Saldo insuficiente.";
  }

  return RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.";
}

function revalidateSchedulingPaths(sessionId?: number) {
  revalidatePath("/admin/calendario");
  revalidatePath("/teacher/clases");
  revalidatePath("/student/clases");
  if (sessionId) revalidatePath(`/admin/calendario/${sessionId}`);
}

// ================================================================================================
// class_schedules -- plantilla semanal recurrente, CRUD directo (admin-only, sin invariante
// cruzada: crear/editar/desactivar un horario no toca sessions).
// ================================================================================================

function mapScheduleRow(row: {
  id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
}): ClassScheduleItem {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isActive: row.is_active,
  };
}

export async function createClassScheduleAction(classroomId: number, formData: FormData): Promise<SchedulingActionState<ClassScheduleItem>> {
  await requireRole("admin");

  const parsed = classScheduleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_schedules")
    .insert({ classroom_id: classroomId, day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime })
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .single();

  if (error || !data) return { error: "No pudimos crear el horario. Inténtalo de nuevo en unos minutos." };

  revalidatePath("/admin/calendario");
  return { data: mapScheduleRow(data) };
}

export async function updateClassScheduleAction(scheduleId: number, formData: FormData): Promise<SchedulingActionState<ClassScheduleItem>> {
  await requireRole("admin");

  const parsed = classScheduleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_schedules")
    .update({ day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime })
    .eq("id", scheduleId)
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .single();

  if (error || !data) return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };

  revalidatePath("/admin/calendario");
  return { data: mapScheduleRow(data) };
}

/** Desactivar en vez de borrar (is_active=false) -- mismo criterio que draft/published en
 * contenido: conserva el horario para reactivarlo, y "usar únicamente schedules activos" en la
 * generación ya lo excluye sin necesidad de eliminarlo. */
export async function setClassScheduleActiveAction(scheduleId: number, isActive: boolean): Promise<SchedulingActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.from("class_schedules").update({ is_active: isActive }).eq("id", scheduleId);
  if (error) return { error: "No pudimos actualizar el horario. Inténtalo de nuevo en unos minutos." };

  revalidatePath("/admin/calendario");
  return {};
}

// ================================================================================================
// Generación de sesiones desde class_schedules -- preview (solo lectura) + confirmación.
// ================================================================================================

interface Candidate {
  classScheduleId: number;
  date: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

/** Expande cada schedule activo a fechas concretas dentro de [dateFrom, dateTo] (ambos incluidos)
 * cuyo día de semana coincida -- el día de semana de una fecha calendario (YYYY-MM-DD) es el
 * mismo sin importar timezone, así que esto NO necesita pasar por la conversión de hora de pared
 * de Lima; esa conversión (limaWallClockToUtc) se aplica solo al construir el instante real de
 * inicio/fin de cada candidata. */
function expandScheduleToDates(schedules: ClassScheduleItem[], dateFrom: string, dateTo: string): Candidate[] {
  const results: Candidate[] = [];
  const [fy, fm, fd] = dateFrom.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = dateTo.split("-").map(Number) as [number, number, number];
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));

  while (cursor.getTime() <= end.getTime()) {
    const weekday = cursor.getUTCDay();
    const dateStr = cursor.toISOString().slice(0, 10);
    for (const schedule of schedules) {
      if (schedule.dayOfWeek !== weekday) continue;
      results.push({
        classScheduleId: schedule.id,
        date: dateStr,
        scheduledStart: limaWallClockToUtc(dateStr, schedule.startTime.slice(0, 5)),
        scheduledEnd: limaWallClockToUtc(dateStr, schedule.endTime.slice(0, 5)),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return results;
}

/**
 * Solo lectura: no inserta nada. Reutilizada tal cual por generateSessionsAction al confirmar,
 * para revalidar duplicados/conflictos en el momento de escribir (defensivo contra una segunda
 * pestaña/admin generando en paralelo entre la previsualización y la confirmación) -- nunca se
 * confía en una lista de "create" que el cliente pudo haber recibido de un preview ya viejo.
 */
export async function previewGeneratedSessionsAction(formData: FormData): Promise<SchedulingActionState<GeneratedSessionPreviewItem[]>> {
  await requireRole("admin");
  return previewGeneratedSessions(formData);
}

// Helper privado: ambos entrypoints públicos validan el rol antes de llamarlo.
// La confirmación recalcula el preview, sin ejecutar por segunda vez el guard.
async function previewGeneratedSessions(formData: FormData): Promise<SchedulingActionState<GeneratedSessionPreviewItem[]>> {
  const parsed = generateSessionsSchema.safeParse({
    classroomId: formData.get("classroomId"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { classroomId, dateFrom, dateTo } = parsed.data;

  const supabase = createClient();

  // Independientes entre sí -- ambas solo dependen de classroomId, ninguna del resultado de la
  // otra -- corren en paralelo en vez de una tras otra.
  const [allSchedules, teacherId] = await Promise.all([getClassSchedules(supabase, classroomId), getActivePrimaryTeacherId(supabase, classroomId)]);
  const schedules = allSchedules.filter((s) => s.isActive);
  if (schedules.length === 0) return { error: "Este salón no tiene horarios activos configurados." };
  if (!teacherId) return { error: "Este salón no tiene un docente titular activo asignado -- asígnalo antes de generar sesiones." };

  const candidates = expandScheduleToDates(schedules, dateFrom, dateTo);
  if (candidates.length === 0) return { data: [] };

  const windowStart = limaWallClockToUtc(dateFrom, "00:00");
  const windowEnd = new Date(limaWallClockToUtc(dateTo, "00:00").getTime() + 24 * 60 * 60_000);

  const { data: existingRows, error: existingError } = await supabase
    .from("sessions")
    .select("scheduled_start")
    .eq("classroom_id", classroomId)
    .gte("scheduled_start", windowStart.toISOString())
    .lt("scheduled_start", windowEnd.toISOString());
  if (existingError) return { error: "No pudimos revisar las sesiones existentes. Inténtalo de nuevo en unos minutos." };

  const existingTimes = new Set(existingRows.map((r) => new Date(r.scheduled_start).getTime()));

  const preview: GeneratedSessionPreviewItem[] = await Promise.all(
    candidates.map(async (c): Promise<GeneratedSessionPreviewItem> => {
      const base = {
        classScheduleId: c.classScheduleId,
        date: c.date,
        scheduledStart: c.scheduledStart.toISOString(),
        scheduledEnd: c.scheduledEnd.toISOString(),
        scheduledTeacherId: teacherId,
      };

      if (existingTimes.has(c.scheduledStart.getTime())) {
        return { ...base, outcome: "duplicate" };
      }

      const conflicts = await findOverlappingSessions(supabase, {
        classroomId,
        teacherId,
        start: c.scheduledStart,
        end: c.scheduledEnd,
      });
      if (conflicts.length > 0) {
        return { ...base, outcome: "conflict", conflictReason: describeConflicts(conflicts) };
      }

      return { ...base, outcome: "create" };
    })
  );

  return { data: preview };
}

export interface GenerateSessionsResult {
  created: number;
  duplicates: number;
  conflicts: number;
}

/** duplicate/conflict NUNCA se crean, ni con confirmación -- solo entran a la generación los
 * ítems "create" recién revalidados. Sin override masivo ni selección fila por fila en esta fase. */
export async function generateSessionsAction(formData: FormData): Promise<SchedulingActionState<GenerateSessionsResult>> {
  await requireRole("admin");

  const preview = await previewGeneratedSessions(formData);
  if (preview.error || preview.fieldErrors || !preview.data) {
    return { error: preview.error, fieldErrors: preview.fieldErrors };
  }

  const classroomId = Number(formData.get("classroomId"));
  const toCreate = preview.data.filter((item) => item.outcome === "create");
  const duplicates = preview.data.filter((item) => item.outcome === "duplicate").length;
  const conflicts = preview.data.filter((item) => item.outcome === "conflict").length;

  if (toCreate.length === 0) {
    return { data: { created: 0, duplicates, conflicts } };
  }

  const supabase = createClient();
  const { error } = await supabase.from("sessions").insert(
    toCreate.map((item) => ({
      classroom_id: classroomId,
      scheduled_teacher_id: item.scheduledTeacherId,
      scheduled_start: item.scheduledStart,
      scheduled_end: item.scheduledEnd,
    }))
  );

  if (error) return { error: "No pudimos generar las sesiones. Inténtalo de nuevo en unos minutos." };

  revalidatePath("/admin/calendario");
  return { data: { created: toCreate.length, duplicates, conflicts } };
}

// ================================================================================================
// Sesiones individuales
// ================================================================================================

/** Bloquea (sin force=true en esta fase) si hay conflicto de salón y/o docente -- ver
 * findOverlappingSessions: best-effort, no reemplaza un constraint de exclusión a nivel de motor. */
export async function createSessionAction(formData: FormData): Promise<SchedulingActionState<{ sessionId: number }>> {
  await requireRole("admin");

  const parsed = createSessionSchema.safeParse({
    classroomId: formData.get("classroomId"),
    scheduledTeacherId: formData.get("scheduledTeacherId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { classroomId, scheduledTeacherId, date, startTime, endTime } = parsed.data;

  const start = limaWallClockToUtc(date, startTime);
  const end = limaWallClockToUtc(date, endTime);

  const supabase = createClient();
  const conflicts = await findOverlappingSessions(supabase, { classroomId, teacherId: scheduledTeacherId, start, end });
  if (conflicts.length > 0) return { error: describeConflicts(conflicts) };

  const { data, error } = await supabase
    .from("sessions")
    .insert({ classroom_id: classroomId, scheduled_teacher_id: scheduledTeacherId, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() })
    .select("id")
    .single();

  if (error || !data) return { error: "No pudimos crear la sesión. Inténtalo de nuevo en unos minutos." };

  revalidateSchedulingPaths(data.id);
  return { data: { sessionId: data.id } };
}

/** cancel_session (0018): admin-only, transaccional (FOR UPDATE + garantiza roster antes de
 * cancelar) -- sustituye el antiguo select+update de dos round-trips, que no era atómico ni
 * garantizaba session_attendance (mismo hueco que tenía complete_session antes de 0018). */
export async function cancelSessionAction(sessionId: number): Promise<SchedulingActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_session", { p_session_id: sessionId });
  if (error) return { error: parseRpcError(error) };

  revalidateSchedulingPaths(sessionId);
  return {};
}

/** change_session_teacher (0009): admin únicamente, siempre SCHEDULED_TEACHER_CHANGED desde acá
 * (reasignar "quién se espera que dicte" antes de que empiece la clase) -- ACTUAL_TEACHER_CHANGED
 * ocurre implícitamente dentro de start_session, no tiene botón propio en esta fase. */
export async function changeSessionTeacherAction(sessionId: number, formData: FormData): Promise<SchedulingActionState> {
  await requireRole("admin");

  const parsed = changeTeacherSchema.safeParse({
    newTeacherId: formData.get("newTeacherId"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.rpc("change_session_teacher", {
    p_session_id: sessionId,
    p_change_type: "SCHEDULED_TEACHER_CHANGED",
    p_new_teacher_id: parsed.data.newTeacherId,
    p_reason: parsed.data.reason || undefined,
  });

  if (error) return { error: parseRpcError(error) };

  revalidateSchedulingPaths(sessionId);
  return {};
}

/** reschedule_session (0009): admin, o el propio docente de la sesión -- la autoridad real es el
 * RPC (valida `scheduled_teacher_id`/`actual_teacher_id`), acá solo se exige estar autenticado
 * para fallar rápido y con un mensaje amigable si no lo está. El chequeo de conflicto es
 * best-effort y bloquea sin excepción en esta fase (sin force=true). */
export async function rescheduleSessionAction(sessionId: number, classroomId: number, formData: FormData): Promise<SchedulingActionState> {
  await requireProfile();

  const parsed = rescheduleSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    newTeacherId: formData.get("newTeacherId") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { date, startTime, endTime, newTeacherId, reason } = parsed.data;

  const start = limaWallClockToUtc(date, startTime);
  const end = limaWallClockToUtc(date, endTime);

  const supabase = createClient();

  let conflictTeacherId = newTeacherId || "";
  if (!conflictTeacherId) {
    const { data: original } = await supabase.from("sessions").select("scheduled_teacher_id").eq("id", sessionId).maybeSingle();
    conflictTeacherId = original?.scheduled_teacher_id ?? "";
  }
  if (conflictTeacherId) {
    const conflicts = await findOverlappingSessions(supabase, {
      classroomId,
      teacherId: conflictTeacherId,
      start,
      end,
      excludeSessionId: sessionId,
    });
    if (conflicts.length > 0) return { error: describeConflicts(conflicts) };
  }

  const { error } = await supabase.rpc("reschedule_session", {
    p_session_id: sessionId,
    p_new_scheduled_start: start.toISOString(),
    p_new_scheduled_end: end.toISOString(),
    p_new_scheduled_teacher_id: newTeacherId || undefined,
    p_reason: reason || undefined,
  });

  if (error) return { error: parseRpcError(error) };

  revalidateSchedulingPaths(sessionId);
  return {};
}

/** start_session (0009): admin o el docente asignado (actual u originalmente programado). Sin UI
 * optimista -- el caller espera esta respuesta antes de reflejar ningún cambio. */
export async function startSessionAction(sessionId: number): Promise<SchedulingActionState> {
  await requireProfile();

  const supabase = createClient();
  const { error } = await supabase.rpc("start_session", { p_session_id: sessionId });
  if (error) return { error: parseRpcError(error) };

  revalidateSchedulingPaths(sessionId);
  return {};
}

/** complete_session (0009): admin o quien figure como actual_teacher_id. */
export async function completeSessionAction(sessionId: number): Promise<SchedulingActionState> {
  await requireProfile();

  const supabase = createClient();
  const { error } = await supabase.rpc("complete_session", { p_session_id: sessionId });
  if (error) return { error: parseRpcError(error) };

  revalidateSchedulingPaths(sessionId);
  return {};
}

// ================================================================================================
// Asistencia y facturación de horas -- admin-only en esta fase (ver auditoría: la arquitectura
// actual no permite que teacher marque asistencia; set_student_session_billing es admin-only y
// solo opera sobre sesiones completed/cancelled). Toda la lógica económica (FIFO, saldos,
// hours_movements) vive exclusivamente en el RPC -- estas acciones son wrappers finos, sin
// ningún cálculo de negocio de este lado.
// ================================================================================================

/** initialize_session_attendance (0009): idempotente (ON CONFLICT DO NOTHING sobre
 * UNIQUE(session_id, student_id)) -- llamarla de nuevo sobre un roster ya generado no duplica
 * nada. Solo tiene efecto mientras la sesión está 'scheduled'. */
export async function initializeAttendanceAction(sessionId: number): Promise<SchedulingActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.rpc("initialize_session_attendance", { p_session_id: sessionId });
  if (error) return { error: parseRpcError(error) };

  revalidatePath(`/admin/calendario/${sessionId}`);
  return {};
}

/**
 * set_student_session_billing (0009): admin únicamente, solo con la sesión 'completed' o
 * 'cancelled'. El RPC decide TODO el consumo FIFO de paquetes y escribe hours_movements
 * internamente -- esta acción nunca calcula minutos, saldos, ni escribe en hours_movements
 * directamente. Una corrección (reenviar con distinto status/minutos sobre una decisión ya
 * tomada) es exactamente la misma llamada; el propio RPC detecta que ya había una decisión previa
 * y aplica la reversión + reaplicación FIFO, nunca algo que este código deba orquestar.
 */
export async function setStudentSessionBillingAction(sessionId: number, studentId: string, formData: FormData): Promise<SchedulingActionState> {
  await requireRole("admin");

  const parsed = billingSchema.safeParse({
    attendanceStatus: formData.get("attendanceStatus"),
    minutesCharged: formData.get("minutesCharged"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.rpc("set_student_session_billing", {
    p_session_id: sessionId,
    p_student_id: studentId,
    p_attendance_status: parsed.data.attendanceStatus,
    p_minutes_charged: parsed.data.minutesCharged,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) return { error: parseRpcError(error) };

  revalidatePath(`/admin/calendario/${sessionId}`);
  return {};
}
