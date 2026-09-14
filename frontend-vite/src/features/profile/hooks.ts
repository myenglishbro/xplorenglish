import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { getMyTeacherProfile } from "@/server/teacher/profile/queries";
import { getMyStudentProfile } from "@/server/student/profile/queries";
import { updateMyProfileName, type UpdateProfileNameInput } from "./api";

export function useMyTeacherProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.teacherProfile(user?.id),
    queryFn: () => getMyTeacherProfile(supabase, user!.id),
    enabled: !!user,
  });
}

export function useMyStudentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.studentProfile(user?.id),
    queryFn: () => getMyStudentProfile(supabase, user!.id),
    enabled: !!user,
  });
}

function useUpdateProfileName(invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: UpdateProfileNameInput) => updateMyProfileName(supabase, user!.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidateKey }),
  });
}

export function useUpdateMyTeacherProfile() {
  const { user } = useAuth();
  return useUpdateProfileName(queryKeys.teacherProfile(user?.id));
}

export function useUpdateMyStudentProfile() {
  const { user } = useAuth();
  return useUpdateProfileName(queryKeys.studentProfile(user?.id));
}
