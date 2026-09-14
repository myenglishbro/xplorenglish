import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getWeekSessions, getClassroomOptions, getPrimaryTeacherByClassroom, getSessionDetail } from "@/server/scheduling/queries";
import { findOverlappingSessions, describeConflicts } from "@/server/scheduling/conflicts";
import { createSessionSchema, changeTeacherSchema, type CreateSessionInput, type ChangeTeacherInput } from "@/server/scheduling/validation";
import { limaWallClockToUtc } from "@/lib/datetime/lima";

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
