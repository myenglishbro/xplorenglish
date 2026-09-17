import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { getMyAvailability, setMyAvailability } from "./api";
import type { AvailabilityBlockDraft } from "./types";

export function useAvailability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.availability(user?.id),
    queryFn: () => getMyAvailability(supabase),
    enabled: !!user,
  });
}

/** Guarda toda la semana de una sola vez (Slice D) -- la grilla consolida celdas contiguas en
 * bloques antes de llamar a esto, nunca un RPC por celda. */
export function useSetAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (blocks: AvailabilityBlockDraft[]) => setMyAvailability(supabase, blocks),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.availability(user?.id) }),
  });
}
