import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getDashboardData } from "@/server/dashboard/queries";

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.adminDashboard(),
    queryFn: () => getDashboardData(supabase),
  });
}
