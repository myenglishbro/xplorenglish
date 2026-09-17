import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listHourPackagesForAdmin, listHoursMovementsForStudent } from "@/server/admin/hours/queries";

/** Todos los paquetes, de todos los estudiantes -- fuente única tanto para la tabla de
 * /admin/paquetes como, filtrada en memoria por studentId, para "Paquetes" en el detalle de un
 * estudiante (evita una segunda query idéntica; si el admin ya vio la lista, el detalle usa el
 * mismo cache). */
export function useAdminHourPackages() {
  return useQuery({
    queryKey: queryKeys.adminHourPackages(),
    queryFn: () => listHourPackagesForAdmin(supabase),
  });
}

export function useStudentHoursMovements(studentId: string) {
  return useQuery({
    queryKey: queryKeys.adminStudentHoursMovements(studentId),
    queryFn: () => listHoursMovementsForStudent(supabase, studentId),
    enabled: !!studentId,
  });
}

const PACKAGE_LIFECYCLE_RPC_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  PACKAGE_NOT_FOUND: "El paquete no existe.",
  INVALID_PACKAGE_STATUS: "Este paquete ya fue cancelado o reembolsado.",
  INSUFFICIENT_BALANCE: "El saldo del alumno quedaría negativo -- ya consumió más minutos de los que esta operación devolvería.",
};

function parsePackageLifecycleError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(PACKAGE_LIFECYCLE_RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la operación. Inténtalo de nuevo en unos minutos.");
}

/** Invalida todo lo que depende del ledger/paquetes de ESTE estudiante -- ciclo de vida de
 * paquetes (versión reducida): cancelar/reembolsar cambia hours_movements y hours_packages.status,
 * así que tanto la vista Admin como el propio dashboard del estudiante deben refrescarse. */
function invalidatePackageQueries(queryClient: ReturnType<typeof useQueryClient>, studentId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminHourPackages() });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminStudentHoursMovements(studentId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.studentBalance(studentId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.hoursPackages(studentId) });
  queryClient.invalidateQueries({ queryKey: ["student-balance-alerts"] });
}

export function useCancelHoursPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId, reason }: { packageId: number; studentId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_cancel_hours_package", { p_package_id: packageId, p_reason: reason || undefined });
      if (error) throw parsePackageLifecycleError(error);
    },
    onSuccess: (_data, variables) => invalidatePackageQueries(queryClient, variables.studentId),
  });
}

/** admin_refund_hours_package también marca el student_payments vinculado como 'refunded' --
 * Financial Reporting (Ingresos = status='completed') deja de contar ese dinero automáticamente,
 * así que se invalidan también sus query keys. */
export function useRefundHoursPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId, reason }: { packageId: number; studentId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_refund_hours_package", { p_package_id: packageId, p_reason: reason || undefined });
      if (error) throw parsePackageLifecycleError(error);
    },
    onSuccess: (_data, variables) => {
      invalidatePackageQueries(queryClient, variables.studentId);
      queryClient.invalidateQueries({ queryKey: ["admin-student-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financial-report"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financial-trend"] });
    },
  });
}
