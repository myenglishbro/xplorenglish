import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { parseRpcError } from "@/lib/rpcError";
import { getRoleSessions } from "@/server/scheduling/queries";

/** upcoming/past -- RLS (sessions_select) ya acota por rol, sin filtro explícito. Mismo query key
 * para teacher y student: cada uno solo ve lo suyo, y nunca comparten sesión de browser. */
export function useSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sessions(user?.id),
    queryFn: () => getRoleSessions(supabase, new Date()),
    enabled: !!user,
  });
}

/**
 * start_session / complete_session (RPC transaccional, 0009) -- la autoridad de quién puede
 * llamarlas vive DENTRO del RPC (admin o el docente asignado), nunca en este hook. Browser-direct
 * es seguro exactamente por eso: no hay ninguna decisión de autorización de este lado.
 */
export function useStartSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const { error } = await supabase.rpc("start_session", { p_session_id: sessionId });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions(user?.id) }),
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const { error } = await supabase.rpc("complete_session", { p_session_id: sessionId });
      if (error) throw new Error(parseRpcError(error));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions(user?.id) }),
  });
}
