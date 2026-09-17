import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getClassroomBasics, getClassroomPeople } from "./api";

export function useClassroomBasics(classroomId: number) {
  return useQuery({
    queryKey: ["classroom-basics", classroomId],
    queryFn: () => getClassroomBasics(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

export function useClassroomPeople(classroomId: number) {
  return useQuery({
    queryKey: ["classroom-people", classroomId],
    queryFn: () => getClassroomPeople(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}
