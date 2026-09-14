import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { secureApiCall } from "@/lib/apiClient";
import { listTeacherProfiles, getActiveClassroomCounts, toTeacherListItem } from "@/server/admin/teachers/queries";
import { updateTeacherProfileSchema, type UpdateTeacherProfileInput } from "@/server/admin/teachers/validation";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import type { TeacherListItem } from "@/server/admin/teachers/types";

/**
 * El email (auth.users, requiere service_role) sigue viniendo del backend seguro
 * (GET /api/admin/users/emails, sin cambios, performance slice 2 no lo toca) -- pero ya no espera
 * a que termine el conteo de salones de classroom_teachers para empezar: ambos solo necesitan los
 * ids de profiles, así que corren en Promise.all en cuanto listTeacherProfiles resuelve. Antes:
 * profiles -> classroom_teachers -> emails (3 olas). Ahora: profiles -> Promise.all(conteo, emails)
 * (2 olas) -- mismas 3 requests, ninguna duplicada, mismo shape final (TeacherListItem).
 */
export function useTeachers() {
  return useQuery({
    queryKey: queryKeys.adminTeachers(),
    queryFn: async (): Promise<TeacherListItem[]> => {
      const profiles = await listTeacherProfiles(supabase);
      if (profiles.length === 0) return [];

      const ids = profiles.map((p) => p.id);
      const [countByTeacher, emailById] = await Promise.all([
        getActiveClassroomCounts(supabase, ids),
        secureApiCall<{ emails: Record<string, string | null> }>(`/api/admin/users/emails?ids=${ids.join(",")}`, { method: "GET" }).then(
          (res) => new Map(Object.entries(res.emails))
        ),
      ]);

      return profiles.map((p) => toTeacherListItem(p, countByTeacher, emailById));
    },
  });
}

/** Salones asignados a un docente específico -- mismo query que el docente ve de sí mismo
 * (server/teacher/classrooms/queries.ts), can_access_classroom() ya incluye is_admin(). */
export function useTeacherClassrooms(teacherId: string) {
  return useQuery({
    queryKey: ["admin-teacher-classrooms", teacherId] as const,
    queryFn: () => listMyClassroomsAsTeacher(supabase, teacherId),
    enabled: !!teacherId,
  });
}

export type UpdateTeacherProfileFieldErrors = Partial<Record<keyof UpdateTeacherProfileInput, string>>;

/**
 * Solo edita teacher_profiles (hourly_rate/bio/status) -- browser-direct, teacher_profiles_admin_write
 * (0003) da a los admins escritura total sobre esta tabla. Nunca profiles.role ni classroom_teachers.
 */
export function useUpdateTeacherProfile(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { hourlyRate: unknown; bio: unknown; status: unknown }) => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", profileId).maybeSingle();
      if (profileError) throw new Error("No pudimos verificar el perfil. Inténtalo de nuevo en unos minutos.");
      if (!profile || profile.role !== "teacher") throw new Error("Este usuario no es un docente.");

      const parsed = updateTeacherProfileSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: UpdateTeacherProfileFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof UpdateTeacherProfileFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: UpdateTeacherProfileFieldErrors };
      }

      const { hourlyRate, bio, status } = parsed.data;
      const { error } = await supabase.from("teacher_profiles").update({ hourly_rate: hourlyRate, bio, status }).eq("profile_id", profileId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTeachers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserDetail(profileId) });
    },
  });
}
