import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getFinancialReport, getFinancialMonthlyTrend } from "@/server/reports/queries";
import type { LimaDateRange } from "@/lib/datetime/lima";

/** La queryKey incluye startDate/endDate (no el objeto Date, que nunca es estable entre renders)
 * -- cambiar de mes produce una queryKey distinta y por lo tanto una query nueva, cacheada por
 * separado; volver a un mes ya visto no vuelve a pedirlo hasta que se invalide. */
export function useFinancialReport(range: LimaDateRange) {
  return useQuery({
    queryKey: queryKeys.adminFinancialReport(range.startDate, range.endDate),
    queryFn: () => getFinancialReport(supabase, range),
  });
}

export function useFinancialMonthlyTrend(monthsBack = 6) {
  return useQuery({
    queryKey: queryKeys.adminFinancialTrend(monthsBack),
    queryFn: () => getFinancialMonthlyTrend(supabase, monthsBack),
  });
}
