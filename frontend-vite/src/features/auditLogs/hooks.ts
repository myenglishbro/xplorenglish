import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listAuditLogs } from "@/server/auditLogs/queries";

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.adminAuditLogs(),
    queryFn: () => listAuditLogs(supabase),
  });
}
