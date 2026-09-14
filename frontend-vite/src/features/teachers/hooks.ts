import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { secureApiCall } from "@/lib/apiClient";
import { listTeachers } from "@/server/admin/teachers/queries";
import { updateTeacherProfileSchema, type UpdateTeacherProfileInput } from "@/server/admin/teachers/validation";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";

/**
 * listTeachers() ya no resuelve emails (ver server/admin/teachers/queries.ts): ese paso requiere
 * auth.admin.listUsers() (service_role), así que se pide aparte al backend seguro
 * (GET /api/admin/users/emails) y se combina en memoria -- mismo resultado final que el listado
 * de Next, con un round-trip HTTP adicional en vez de una llamada Admin API server-side.
 */
export function useTeachers() {
  return useQuery({
    queryKey: queryKeys.adminTeachers(),
    queryFn: async () => {
      const rows = await listTeachers(supabase, new Map());
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return rows;
      const { emails } = await secureApiCall<{ emails: Record<string, string | null> }>(`/api/admin/users/emails?ids=${ids.join(",")}`, {
        method: "GET",
      });
      return rows.map((r) => ({ ...r, email: emails[r.id] ?? null }));
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
