import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getAllClassSchedules, getClassSchedules } from "@/server/scheduling/queries";
import { classScheduleSchema, type ClassScheduleInput } from "@/server/scheduling/validation";

function parseError(error: { message: string }): string {
  return error.message.split(":")[0] === "" ? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos." : error.message;
}

// ================================================================================================
// class_schedules -- plantilla semanal RECURSIVA REFERENCIAL, browser-direct
// (class_schedules_admin_write, 0006). Nunca genera class_records ni bloquea nada (Slice A/F).
// ================================================================================================

export function useAllClassSchedules() {
  return useQuery({
    queryKey: queryKeys.adminAllClassSchedules(),
    queryFn: () => getAllClassSchedules(supabase),
  });
}

export function useClassSchedules(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.adminClassSchedules(classroomId),
    queryFn: () => getClassSchedules(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

export type ClassScheduleFieldErrors = Partial<Record<keyof ClassScheduleInput, string>>;

function invalidateClassScheduleQueries(queryClient: ReturnType<typeof useQueryClient>, classroomId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminAllClassSchedules() });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminClassSchedules(classroomId) });
  // La Agenda semanal del Dashboard (ajuste post-Slice H) también lee class_schedules -- sin esto
  // quedaría desactualizada dentro de la misma sesión hasta recargar.
  queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() });
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
      if (error) throw new Error(parseError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

export function useSetClassScheduleActive(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      const { error } = await supabase.from("class_schedules").update({ is_active: isActive }).eq("id", scheduleId);
      if (error) throw new Error(parseError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

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
      if (error) throw new Error(parseError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}

export function useDeleteClassSchedule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: number) => {
      const { error } = await supabase.from("class_schedules").delete().eq("id", scheduleId);
      if (error) throw new Error(parseError(error));
    },
    onSuccess: () => invalidateClassScheduleQueries(queryClient, classroomId),
  });
}
