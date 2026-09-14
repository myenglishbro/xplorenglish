import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentHoursPackages, getStudentAttendanceHistory } from "@/server/hours/queries";

export function useHoursPackages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.hoursPackages(user?.id),
    queryFn: () => getStudentHoursPackages(supabase),
    enabled: !!user,
  });
}

export function useAttendanceHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.attendanceHistory(user?.id),
    queryFn: () => getStudentAttendanceHistory(supabase),
    enabled: !!user,
  });
}
