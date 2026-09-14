import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listStudentPayments, getPaymentDetail } from "@/server/payments/queries";
import { createHourPackageSchema, type CreateHourPackageInput } from "@/server/payments/validation";
import type { PaymentListFilters, CreateHourPackageResult } from "@/server/payments/types";

export function useStudentPayments(filters: PaymentListFilters) {
  return useQuery({
    queryKey: queryKeys.adminStudentPayments({ studentId: filters.studentId, status: filters.status }),
    queryFn: () => listStudentPayments(supabase, filters),
  });
}

export function usePaymentDetail(paymentId: number) {
  return useQuery({
    queryKey: queryKeys.adminPaymentDetail(paymentId),
    queryFn: () => getPaymentDetail(supabase, paymentId),
    enabled: Number.isFinite(paymentId),
  });
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para registrar pagos.",
  INVALID_IDEMPOTENCY_KEY: "Falta la clave de idempotencia. Vuelve a intentarlo.",
  STUDENT_NOT_FOUND: "Ese estudiante no existe o no está activo.",
  INVALID_AMOUNT: "Revisa los minutos y el precio ingresados.",
};

export type CreateHourPackageFieldErrors = Partial<Record<keyof CreateHourPackageInput, string>>;

/**
 * RPC directo -- único punto de escritura de este dominio (create_hour_package, 0009), sin
 * ningún INSERT directo a student_payments/hours_packages/hours_movements. `idempotencyKey` la
 * genera el caller (CreateHourPackageButton) una vez por intención de compra; este hook nunca
 * genera una propia, solo la reenvía.
 */
export function useCreateHourPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHourPackageInput): Promise<CreateHourPackageResult> => {
      const parsed = createHourPackageSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: CreateHourPackageFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof CreateHourPackageFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: CreateHourPackageFieldErrors };
      }

      const { data, error } = await supabase.rpc("create_hour_package", {
        p_student_id: parsed.data.studentId,
        p_package_label: parsed.data.packageLabel,
        p_total_minutes: parsed.data.totalMinutes,
        p_price: parsed.data.price,
        p_payment_method: parsed.data.paymentMethod,
        p_idempotency_key: parsed.data.idempotencyKey,
        p_currency: parsed.data.currency || undefined,
        p_payment_reference: parsed.data.paymentReference || undefined,
      });

      if (error) {
        const code = error.message.split(":")[0]?.trim() ?? "";
        throw new Error(RPC_ERROR_MESSAGES[code] ?? "No pudimos registrar el pago. Inténtalo de nuevo en unos minutos.");
      }
      const row = data?.[0];
      if (!row) throw new Error("No pudimos registrar el pago. Inténtalo de nuevo en unos minutos.");

      return { paymentId: row.payment_id, packageId: row.package_id, movementId: row.movement_id };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-payments"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminHourPackages() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudentHoursMovements(variables.studentId) });
    },
  });
}
