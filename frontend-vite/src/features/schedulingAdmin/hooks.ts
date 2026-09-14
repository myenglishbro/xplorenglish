import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  getWeekSessions,
  getClassroomOptions,
  getPrimaryTeacherByClassroom,
  getSessionDetail,
  getAllClassSchedules,
  getClassSchedules,
  getActivePrimaryTeacherId,
  getSessionAttendanceRoster,
} from "@/server/scheduling/queries";
import { findOverlappingSessions, describeConflicts } from "@/server/scheduling/conflicts";
import {
  createSessionSchema,
  changeTeacherSchema,
  classScheduleSchema,
  generateSessionsSchema,
  rescheduleSchema,
  billingSchema,
  type CreateSessionInput,
  type ChangeTeacherInput,
  type ClassScheduleInput,
  type GenerateSessionsInput,
  type RescheduleInput,
  type BillingInput,
} from "@/server/scheduling/validation";
import { limaWallClockToUtc } from "@/lib/datetime/lima";
import type { ClassScheduleItem, GeneratedSessionPreviewItem } from "@/server/scheduling/types";

export function useWeekSessions(filters: { weekStart: Date; weekEnd: Date; classroomId?: number; teacherId?: string }) {
  return useQuery({
    queryKey: queryKeys.adminWeekSessions({
      weekStart: filters.weekStart.toISOString(),
      weekEnd: filters.weekEnd.toISOString(),
      classroomId: filters.classroomId,
      teacherId: filters.teacherId,
    }),
    queryFn: () => getWeekSessions(supabase, filters),
  });
}

export function useClassroomOptions() {
  return useQuery({
    queryKey: queryKeys.adminClassroomOptions(),
    queryFn: () => getClassroomOptions(supabase),
  });
}

export function usePrimaryTeacherByClassroom() {
  return useQuery({
    queryKey: queryKeys.adminPrimaryTeacherByClassroom(),
    queryFn: () => getPrimaryTeacherByClassroom(supabase),
  });
}

export function useSessionDetail(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.adminSessionDetail(sessionId),
    queryFn: () => getSessionDetail(supabase, sessionId),
    enabled: Number.isFinite(sessionId),
  });
}

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
  NO_AVAILABILITY: "Ese docente no tiene disponibilidad registrada.",
  INSUFFICIENT_AVAILABILITY: "La disponibilidad del docente no cubre ese horario.",
  SCHEDULE_CONFLICT: "Ese docente ya tiene un compromiso que se solapa con este horario.",
};

function parseRpcError(error: { message: string }): string {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.";
}

function invalidateSchedulingQueries(queryClient: ReturnType<typeof useQueryClient>, sessionId?: number) {
  queryClient.invalidateQueries({ queryKey: ["admin-week-sessions"] });
  if (sessionId !== undefined) queryClient.invalidateQueries({ queryKey: queryKeys.adminSessionDetail(sessionId) });
}

export type CreateSessionFieldErrors = Partial<Record<keyof CreateSessionInput, string>>;

/** Bloquea (sin force=true en esta fase) si hay conflicto de salón y/o docente -- best-effort,
 * ver server/scheduling/conflicts.ts. Browser-direct: RLS (sessions_admin_write) ya autoriza a
 * admin sin necesidad de RPC para un INSERT simple. */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const parsed = createSessionSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: CreateSessionFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof CreateSessionFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: CreateSessionFieldErrors };
      }
      const { classroomId, scheduledTeacherId, date, startTime, endTime } = parsed.data;
      const start = limaWallClockToUtc(date, startTime);
      const end = limaWallClockToUtc(date, endTime);

      const conflicts = await findOverlappingSessions(supabase, { classroomId, teacherId: scheduledTeacherId, start, end });
      if (conflicts.length > 0) throw new Error(describeConflicts(conflicts));

      const { data, error } = await supabase
        .from("sessions")
        .insert({ classroom_id: classroomId, scheduled_teacher_id: scheduledTeacherId, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() })
        .select("id")
        .single();
      if (error || !data) throw new Error("No pudimos crear la sesión. Inténtalo de nuevo en unos minutos.");
      return data.id as number;
    },
    onSuccess: () => invalidateSchedulingQueries(queryClient),
  });
}

/** cancel_session (0018) -- RPC directo, transaccional. */
export function useCancelSession(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cancel_session", { p_session_id: sessionId });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateSchedulingQueries(queryClient, sessionId),
  });
}

export type ChangeTeacherFieldErrors = Partial<Record<keyof ChangeTeacherInput, string>>;

/** change_session_teacher (0009) -- RPC directo, siempre SCHEDULED_TEACHER_CHANGED desde acá
 * (reasignar antes de que empiece la clase). */
export function useReassignTeacher(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangeTeacherInput) => {
      const parsed = changeTeacherSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: ChangeTeacherFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof ChangeTeacherFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: ChangeTeacherFieldErrors };
      }
      const { error } = await supabase.rpc("change_session_teacher", {
        p_session_id: sessionId,
        p_change_type: "SCHEDULED_TEACHER_CHANGED",
        p_new_teacher_id: parsed.data.newTeacherId,
        p_reason: parsed.data.reason || undefined,
      });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateSchedulingQueries(queryClient, sessionId),
  });
}

// ================================================================================================
// class_schedules -- plantilla semanal recurrente, browser-direct (class_schedules_admin_write,
// 0006). Crear/editar un horario NUNCA genera sesiones por sí solo -- eso es un paso aparte (ver
// generación de sesiones más abajo).
// ================================================================================================

export function useAllClassSchedules() {
  return useQuery({
    queryKey: queryKeys.adminAllClassSchedules(),
    queryFn: () => getAllClassSchedules(supabase),
  });
}

/** Horarios de UN solo salón -- a diferencia de useAllClassSchedules (todos los salones, filtrado
 * client-side), esta filtra server-side vía getClassSchedules(classroomId). Reemplaza el uso de
 * useAllClassSchedules en /admin/salones/:id (performance slice 1): esa pantalla nunca necesitó el
 * horario de los demás salones. /admin/calendario sigue usando useAllClassSchedules a propósito
 * (ahí sí hace falta ver/elegir entre varios salones en el mismo modal). */
export function useClassSchedules(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.adminClassSchedules(classroomId),
    queryFn: () => getClassSchedules(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

export type ClassScheduleFieldErrors = Partial<Record<keyof ClassScheduleInput, string>>;

/** Invalida ambas fuentes de class_schedules -- la vista "todos los salones" (Calendario) y la
 * vista "un salón" (Salones) no comparten queryKey, así que una mutación desde cualquiera de las
 * dos pantallas debe refrescar las dos. */
function invalidateClassScheduleQueries(queryClient: ReturnType<typeof useQueryClient>, classroomId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminAllClassSchedules() });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminClassSchedules(classroomId) });
}

export function useCreateClassSchedule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassScheduleInput) => {
      const parsed = classScheduleSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: ClassScheduleFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof ClassScheduleFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: ClassScheduleFieldErrors };
      }
      const { error } = await supabase
        .from("class_schedules")
        .insert({ classroom_id: classroomId, day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

/** Activar/editar un horario cuando el salón ya tiene PRIMARY revalida su compatibilidad
 * server-side (trigger class_schedules_check_primary_compatibility, 0019) -- por eso este error
 * también se traduce con parseRpcError en vez del mensaje genérico anterior. */
export function useSetClassScheduleActive(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      const { error } = await supabase.from("class_schedules").update({ is_active: isActive }).eq("id", scheduleId);
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

/** Editar día/hora de un horario existente -- mismo trigger de revalidación de compatibilidad que
 * useSetClassScheduleActive (0019) cuando el salón ya tiene PRIMARY. */
export function useUpdateClassSchedule(scheduleId: number, classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassScheduleInput) => {
      const parsed = classScheduleSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: ClassScheduleFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof ClassScheduleFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: ClassScheduleFieldErrors };
      }
      const { error } = await supabase
        .from("class_schedules")
        .update({ day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime })
        .eq("id", scheduleId);
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

/** class_schedules_admin_write (0006) es "for all", así que DELETE ya está permitido por RLS sin
 * cambios de backend -- misma política que ya usan insert/update. */
export function useDeleteClassSchedule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: number) => {
      const { error } = await supabase.from("class_schedules").delete().eq("id", scheduleId);
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

// ================================================================================================
// Generación de sesiones desde class_schedules -- preview (solo lectura) + confirmación, sin RPC.
// ================================================================================================

interface ScheduleCandidate {
  classScheduleId: number;
  date: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

/** Mismo criterio que server/scheduling/actions.ts (Next): el dia de semana de una fecha
 * calendario (YYYY-MM-DD) es el mismo sin importar timezone, asi que esto NO necesita pasar por
 * limaWallClockToUtc -- esa conversion se aplica solo al construir el instante real de inicio/fin
 * de cada candidata. */
function expandScheduleToDates(schedules: ClassScheduleItem[], dateFrom: string, dateTo: string): ScheduleCandidate[] {
  const results: ScheduleCandidate[] = [];
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

export type GenerateSessionsFieldErrors = Partial<Record<keyof GenerateSessionsInput, string>>;

function parseGenerateSessionsInput(input: GenerateSessionsInput) {
  const parsed = generateSessionsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: GenerateSessionsFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof GenerateSessionsFieldErrors] = issue.message;
    }
    throw { fieldErrors } as { fieldErrors: GenerateSessionsFieldErrors };
  }
  return parsed.data;
}

/**
 * Solo lectura: no inserta nada. Reutilizada tal cual por useGenerateSessions al confirmar, para
 * revalidar duplicados/conflictos en el momento de escribir (defensivo contra una segunda
 * pestana/admin generando en paralelo entre la previsualizacion y la confirmacion) -- nunca se
 * confia en una lista de "create" que el cliente pudo haber recibido de un preview ya viejo.
 */
async function computeSessionsPreview(
  input: GenerateSessionsInput
): Promise<{ classroomId: number; preview: GeneratedSessionPreviewItem[] }> {
  const { classroomId, dateFrom, dateTo } = parseGenerateSessionsInput(input);

  const [allSchedules, teacherId] = await Promise.all([
    getClassSchedules(supabase, classroomId),
    getActivePrimaryTeacherId(supabase, classroomId),
  ]);
  const schedules = allSchedules.filter((s) => s.isActive);
  if (schedules.length === 0) throw new Error("Este salón no tiene horarios activos configurados.");
  if (!teacherId) throw new Error("Este salón no tiene un docente titular activo asignado -- asígnalo antes de generar sesiones.");

  const candidates = expandScheduleToDates(schedules, dateFrom, dateTo);
  if (candidates.length === 0) return { classroomId, preview: [] };

  const windowStart = limaWallClockToUtc(dateFrom, "00:00");
  const windowEnd = new Date(limaWallClockToUtc(dateTo, "00:00").getTime() + 24 * 60 * 60_000);

  const { data: existingRows, error: existingError } = await supabase
    .from("sessions")
    .select("scheduled_start")
    .eq("classroom_id", classroomId)
    .gte("scheduled_start", windowStart.toISOString())
    .lt("scheduled_start", windowEnd.toISOString());
  if (existingError) throw new Error("No pudimos revisar las sesiones existentes. Inténtalo de nuevo en unos minutos.");

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

  return { classroomId, preview };
}

export function usePreviewGeneratedSessions() {
  return useMutation({
    mutationFn: (input: GenerateSessionsInput) => computeSessionsPreview(input).then((r) => r.preview),
  });
}

export interface GenerateSessionsResult {
  created: number;
  duplicates: number;
  conflicts: number;
}

/** duplicate/conflict NUNCA se crean, ni con confirmacion -- solo entran a la generacion los
 * items "create" recien revalidados. Sin override masivo ni seleccion fila por fila en esta fase. */
export function useGenerateSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateSessionsInput): Promise<GenerateSessionsResult> => {
      const { classroomId, preview } = await computeSessionsPreview(input);

      const toCreate = preview.filter((item) => item.outcome === "create");
      const duplicates = preview.filter((item) => item.outcome === "duplicate").length;
      const conflicts = preview.filter((item) => item.outcome === "conflict").length;

      if (toCreate.length === 0) {
        return { created: 0, duplicates, conflicts };
      }

      const { error } = await supabase.from("sessions").insert(
        toCreate.map((item) => ({
          classroom_id: classroomId,
          scheduled_teacher_id: item.scheduledTeacherId,
          scheduled_start: item.scheduledStart,
          scheduled_end: item.scheduledEnd,
        }))
      );
      if (error) throw new Error("No pudimos generar las sesiones. Inténtalo de nuevo en unos minutos.");

      return { created: toCreate.length, duplicates, conflicts };
    },
    onSuccess: () => invalidateSchedulingQueries(queryClient),
  });
}

// ================================================================================================
// Reprogramar sesion -- RPC reschedule_session (0009). Compartido por admin (calendario) y el
// propio docente de la sesion (server-side: el RPC valida scheduled_teacher_id/actual_teacher_id).
// ================================================================================================

export type RescheduleFieldErrors = Partial<Record<keyof RescheduleInput, string>>;

export function useRescheduleSession(sessionId: number, classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RescheduleInput) => {
      const parsed = rescheduleSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: RescheduleFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof RescheduleFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: RescheduleFieldErrors };
      }
      const { date, startTime, endTime, newTeacherId, reason } = parsed.data;
      const start = limaWallClockToUtc(date, startTime);
      const end = limaWallClockToUtc(date, endTime);

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
        if (conflicts.length > 0) throw new Error(describeConflicts(conflicts));
      }

      const { error } = await supabase.rpc("reschedule_session", {
        p_session_id: sessionId,
        p_new_scheduled_start: start.toISOString(),
        p_new_scheduled_end: end.toISOString(),
        p_new_scheduled_teacher_id: newTeacherId || undefined,
        p_reason: reason || undefined,
      });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => invalidateSchedulingQueries(queryClient, sessionId),
  });
}

// ================================================================================================
// Asistencia y facturacion de horas -- admin-only, RPCs initialize_session_attendance /
// set_student_session_billing (0009). Wrappers finos, sin ningun calculo de negocio de este lado.
// ================================================================================================

export function useSessionAttendanceRoster(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.adminSessionAttendanceRoster(sessionId),
    queryFn: () => getSessionAttendanceRoster(supabase, sessionId),
    enabled: Number.isFinite(sessionId),
  });
}

/** Idempotente (ON CONFLICT DO NOTHING sobre UNIQUE(session_id, student_id)) -- llamarla de nuevo
 * sobre un roster ya generado no duplica nada. Solo tiene efecto mientras la sesion esta
 * 'scheduled'. */
export function useInitializeAttendance(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("initialize_session_attendance", { p_session_id: sessionId });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminSessionAttendanceRoster(sessionId) }),
  });
}

export type BillingFieldErrors = Partial<Record<keyof BillingInput, string>>;

/**
 * set_student_session_billing (0009) -- solo con la sesion 'completed' o 'cancelled'. El RPC
 * decide TODO el consumo FIFO de paquetes y escribe hours_movements internamente; este hook nunca
 * calcula minutos, saldos, ni escribe en hours_movements directamente.
 */
export function useSetStudentSessionBilling(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, ...input }: BillingInput & { studentId: string }) => {
      const parsed = billingSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: BillingFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof BillingFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: BillingFieldErrors };
      }
      const { error } = await supabase.rpc("set_student_session_billing", {
        p_session_id: sessionId,
        p_student_id: studentId,
        p_attendance_status: parsed.data.attendanceStatus,
        p_minutes_charged: parsed.data.minutesCharged,
        p_notes: parsed.data.notes || undefined,
      });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminSessionAttendanceRoster(sessionId) }),
  });
}
