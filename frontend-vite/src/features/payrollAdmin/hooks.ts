import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getTeacherPaymentSummaries, getTeacherName, getTeacherPaymentStatement, payTeacherClasses } from "@/server/payroll/queries";

/** Listado principal Admin -> Pagos a profesores (Slice E). */
export function useTeacherPaymentSummaries() {
  return useQuery({
    queryKey: queryKeys.adminTeacherPaymentSummary(),
    queryFn: () => getTeacherPaymentSummaries(supabase),
  });
}

export function useTeacherName(teacherId: string | undefined) {
  return useQuery({
    queryKey: ["admin-teacher-name", teacherId],
    queryFn: () => getTeacherName(supabase, teacherId!),
    enabled: !!teacherId,
  });
}

/** Estado de cuenta cronológico de un profesor (más reciente arriba). */
export function useTeacherPaymentStatement(teacherId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminTeacherPaymentStatement(teacherId ?? ""),
    queryFn: () => getTeacherPaymentStatement(supabase, teacherId!),
    enabled: !!teacherId,
  });
}

/**
 * pay_teacher_classes (Slice E) -- el backend recalcula/valida todo; este hook nunca calcula ni
 * envía totales. Tras el éxito se invalida (no optimistic update financiero) para que las clases
 * pagadas y el resumen pendiente reflejen exactamente lo que quedó en la DB.
 */
export function usePayTeacherClasses(teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classRecordIds, reference }: { classRecordIds: number[]; reference: string | null }) =>
      payTeacherClasses(supabase, teacherId!, classRecordIds, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTeacherPaymentSummary() });
      if (teacherId) queryClient.invalidateQueries({ queryKey: queryKeys.adminTeacherPaymentStatement(teacherId) });
      // Micro-fix post-Slice I: pay_teacher_classes cambia teacher_payments/class_records.teacher_payment_id,
      // de los que depende Financial Reporting (Docentes pagados, Flujo de caja, Deuda docente actual).
      // Prefijo sin startDate/endDate para invalidar CUALQUIER rango cacheado (mismo patrón que
      // features/expensesAdmin/hooks.ts), más la tendencia mensual.
      queryClient.invalidateQueries({ queryKey: ["admin-financial-report"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financial-trend"] });
    },
  });
}
