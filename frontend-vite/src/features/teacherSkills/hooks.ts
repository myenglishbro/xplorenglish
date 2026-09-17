import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { getSkillsCatalog, getMyTeacherSkillIds, setMyTeacherSkills } from "./api";

function mySkillIdsKey(teacherId: string | undefined) {
  return ["teacher-skills", teacherId] as const;
}

export function useSkillsCatalog() {
  return useQuery({
    queryKey: ["skills-catalog"],
    queryFn: () => getSkillsCatalog(supabase),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyTeacherSkillIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: mySkillIdsKey(user?.id),
    queryFn: () => getMyTeacherSkillIds(supabase),
    enabled: !!user,
  });
}

/** Guarda toda la selección de niveles de una sola vez (Slice D) -- nunca un RPC por checkbox. */
export function useSetTeacherSkills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (skillIds: number[]) => setMyTeacherSkills(supabase, skillIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mySkillIdsKey(user?.id) }),
  });
}
