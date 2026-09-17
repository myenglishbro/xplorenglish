import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentBalanceAlerts } from "@/server/balanceAlerts/queries";

/** Alertas de saldo (Admin/Teacher, Slice G) -- ver get_student_balance_alerts. Solo se usa desde
 * páginas Admin/Teacher; Student no la necesita (ya tiene su propio saldo vía useStudentBalance). */
export function useStudentBalanceAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.studentBalanceAlerts(user?.id),
    queryFn: () => getStudentBalanceAlerts(supabase),
    enabled: !!user,
  });
}
