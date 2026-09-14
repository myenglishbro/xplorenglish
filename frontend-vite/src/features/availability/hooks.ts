import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { getMyAvailability, createAvailabilityBlock, updateAvailabilityBlock, deleteAvailabilityBlock } from "./api";
import type { AvailabilityBlockInput } from "./validation";

function availabilityKey(teacherId: string | undefined) {
  return ["teacher-availability", teacherId] as const;
}

export function useAvailability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: availabilityKey(user?.id),
    queryFn: () => getMyAvailability(supabase),
    enabled: !!user,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: AvailabilityBlockInput) => createAvailabilityBlock(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKey(user?.id) }),
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AvailabilityBlockInput }) => updateAvailabilityBlock(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKey(user?.id) }),
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: number) => deleteAvailabilityBlock(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKey(user?.id) }),
  });
}
