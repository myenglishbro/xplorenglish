import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import { listMyClassroomsAsStudent } from "@/server/student/classrooms/queries";

export function useMyClassroomsAsTeacher() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.teacherClassrooms(user?.id),
    queryFn: () => listMyClassroomsAsTeacher(supabase, user!.id),
    enabled: !!user,
  });
}

export function useMyClassroomsAsStudent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.studentClassrooms(user?.id),
    queryFn: () => listMyClassroomsAsStudent(supabase, user!.id),
    enabled: !!user,
  });
}
