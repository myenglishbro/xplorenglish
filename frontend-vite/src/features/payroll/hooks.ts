import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { getTeacherPaymentStatement } from "@/server/payroll/queries";

/**
 * "Mis pagos" (Teacher) -- fix post-Slice F: reemplaza el flujo viejo de periodos/recibos
 * (teacher_payment_periods/teacher_receipts, eliminado en Slice A/E) con una lectura mínima de solo
 * lectura sobre la misma fuente que ya usa Admin (getTeacherPaymentStatement, Slice E):
 * class_records + teacher_payments. Sin checkboxes ni acción de pago -- eso es exclusivo de Admin.
 */
export function useMyPaymentStatement() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-payment-statement", user?.id],
    queryFn: () => getTeacherPaymentStatement(supabase, user!.id),
    enabled: !!user,
  });
}
