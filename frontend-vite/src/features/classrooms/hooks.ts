import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import { listMyClassroomsAsStudent } from "@/server/student/classrooms/queries";
import { getMyWeeklyScheduleAsTeacher } from "@/server/teacher/schedule/queries";
import { getMyWeeklyScheduleAsStudent } from "@/server/student/schedule/queries";

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

/** Horario semanal (FIX 7, segunda etapa) -- class_schedules, nunca class_records ni
 * teacher_availability. `user.id` viene siempre de la sesión autenticada. */
export function useMyWeeklyScheduleAsTeacher() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-weekly-schedule-teacher", user?.id] as const,
    queryFn: () => getMyWeeklyScheduleAsTeacher(supabase, user!.id),
    enabled: !!user,
  });
}

export function useMyWeeklyScheduleAsStudent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-weekly-schedule-student", user?.id] as const,
    queryFn: () => getMyWeeklyScheduleAsStudent(supabase, user!.id),
    enabled: !!user,
  });
}
