import { useQuery } from "@tanstack/react-query";
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
