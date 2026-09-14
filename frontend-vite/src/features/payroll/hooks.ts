import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { listPayrollPeriods, getPayrollPeriodDetail } from "@/server/payroll/queries";
import { uploadTeacherReceiptFile } from "@/lib/storage/teacherReceipts";

export function usePayrollPeriods() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.payrollPeriods(user?.id),
    queryFn: () => listPayrollPeriods(supabase),
    enabled: !!user,
  });
}

export function usePayrollPeriodDetail(periodId: number) {
  return useQuery({
    queryKey: queryKeys.payrollPeriodDetail(periodId),
    queryFn: () => getPayrollPeriodDetail(supabase, periodId),
    enabled: Number.isFinite(periodId),
  });
}

/**
 * Dos pasos, cada uno con su propia autoridad real (portado de TeacherReceiptSection/Next):
 * 1) Storage directo navegador->bucket -- RLS decide si procede.
 * 2) RPC upload_teacher_receipt -- única fuente de verdad de la fila en teacher_receipts.
 */
export function useUploadTeacherReceipt(periodId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const uploadResult = await uploadTeacherReceiptFile(supabase, user!.id, periodId, file);
      if ("error" in uploadResult) throw new Error(uploadResult.error);

      const { error } = await supabase.rpc("upload_teacher_receipt", {
        p_teacher_payment_period_id: periodId,
        p_file_path: uploadResult.path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payrollPeriodDetail(periodId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payrollPeriods(user?.id) });
    },
  });
}
