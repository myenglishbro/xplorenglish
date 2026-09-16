import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listPayrollPeriods, getPayrollPeriodDetail, listTeacherDebtSummary } from "@/server/payroll/queries";
import { createPayrollPeriodSchema, type CreatePayrollPeriodInput } from "@/server/payroll/validation";

/** listPayrollPeriods() sin filtro -- RLS (teacher_payment_periods_select, 0008) ya devuelve
 * todos los periodos a un admin y solo los propios a un docente; esta vista es exclusivamente
 * admin (ver pages/admin/PagosDocentesListPage.tsx). */
export function useAdminPayrollPeriods() {
  return useQuery({
    queryKey: queryKeys.adminPayrollPeriods(),
    queryFn: () => listPayrollPeriods(supabase),
  });
}

export function useAdminPayrollPeriodDetail(periodId: number) {
  return useQuery({
    queryKey: queryKeys.payrollPeriodDetail(periodId),
    queryFn: () => getPayrollPeriodDetail(supabase, periodId),
    enabled: Number.isFinite(periodId),
  });
}

/** "¿Cuánto debo?" -- automático, sin filtros (Slice 3). Independiente de useAdminPayrollPeriods:
 * esta no lee teacher_payment_periods como lista, agrega teacher_hours_log directamente (ver
 * listTeacherDebtSummary). */
export function useTeacherDebtSummary() {
  return useQuery({
    queryKey: queryKeys.adminTeacherDebtSummary(),
    queryFn: () => listTeacherDebtSummary(supabase),
  });
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  INVALID_DATE_RANGE: "La fecha de fin debe ser mayor o igual a la de inicio.",
  TEACHER_NOT_FOUND: "Ese docente no existe o no está activo.",
  NO_ELIGIBLE_HOURS: "Este docente no tiene horas dictadas sin periodo asignado en ese rango de fechas.",
  PERIOD_NOT_FOUND: "El periodo no existe.",
  ALREADY_PAID: "Este periodo ya fue pagado.",
  MISSING_RECEIPT: "El periodo todavía no tiene un recibo subido -- no se puede aprobar.",
  NOT_APPROVED: "El periodo debe estar aprobado antes de marcarlo como pagado.",
  PERIOD_ALREADY_REVIEWED: "Este periodo ya fue aprobado o pagado -- ya no se puede subir ni reemplazar el recibo.",
  INVALID_FILE_PATH: "La ruta del archivo no es válida.",
};

function messageFor(error: { message: string }): string {
  const code = error.message.split(":")[0] ?? "";
  return RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.";
}

export type CreatePayrollPeriodFieldErrors = Partial<Record<keyof CreatePayrollPeriodInput, string>>;

/**
 * Envoltorio delgado sobre create_teacher_payment_period (0009) -- RPC directo, nunca calcula
 * total_minutes/total_amount ni decide qué horas entran: eso lo resuelve el RPC leyendo
 * teacher_hours_log directamente.
 */
export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePayrollPeriodInput) => {
      const parsed = createPayrollPeriodSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: CreatePayrollPeriodFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof CreatePayrollPeriodFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: CreatePayrollPeriodFieldErrors };
      }
      const { error } = await supabase.rpc("create_teacher_payment_period", {
        p_teacher_id: parsed.data.teacherId,
        p_period_start: parsed.data.periodStart,
        p_period_end: parsed.data.periodEnd,
      });
      if (error) throw new Error(messageFor(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPayrollPeriods() });
      // Agrupar horas en un periodo no cambia generado/pagado/pendiente (el periodo nace
      // 'pending', no 'paid'), pero si el resumen de deuda ya se leyó antes de crear este periodo,
      // más vale invalidar igual: es una query barata y evita cualquier duda de estado stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTeacherDebtSummary() });
    },
  });
}

function invalidatePeriod(queryClient: ReturnType<typeof useQueryClient>, periodId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminPayrollPeriods() });
  queryClient.invalidateQueries({ queryKey: queryKeys.payrollPeriodDetail(periodId) });
  // approve_teacher_payment_period no cambia dinero (solo status pending->approved, sigue sin
  // pagar); mark_teacher_payment_period_paid sí (status->paid), lo que mueve el importe de
  // "pendiente" a "pagado" en el resumen -- invalidar en ambos casos es correcto y barato.
  queryClient.invalidateQueries({ queryKey: queryKeys.adminTeacherDebtSummary() });
}

export function useApprovePayrollPeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("approve_teacher_payment_period", { p_teacher_payment_period_id: periodId });
      if (error) throw new Error(messageFor(error));
    },
    onSuccess: () => invalidatePeriod(queryClient, periodId),
  });
}

export function useMarkPayrollPeriodPaid(periodId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_teacher_payment_period_paid", { p_teacher_payment_period_id: periodId });
      if (error) throw new Error(messageFor(error));
    },
    onSuccess: () => invalidatePeriod(queryClient, periodId),
  });
}
