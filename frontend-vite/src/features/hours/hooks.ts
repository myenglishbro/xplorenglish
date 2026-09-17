import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentHoursPackages, getStudentAttendanceHistory, getStudentTotalBalance } from "@/server/hours/queries";

export function useHoursPackages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.hoursPackages(user?.id),
    queryFn: () => getStudentHoursPackages(supabase),
    enabled: !!user,
  });
}

/** Saldo TOTAL real del estudiante (ledger completo, ver getStudentTotalBalance) -- fuente única
 * del número mostrado en Inicio y en Mis horas. */
export function useStudentBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.studentBalance(user?.id),
    queryFn: () => getStudentTotalBalance(supabase),
    enabled: !!user,
  });
}

export function useAttendanceHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.attendanceHistory(user?.id),
    queryFn: () => getStudentAttendanceHistory(supabase, user!.id),
    enabled: !!user,
  });
}
