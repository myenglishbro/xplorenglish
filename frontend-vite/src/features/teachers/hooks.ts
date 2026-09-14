import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listTeacherProfiles, getActiveClassroomCounts, toTeacherListItem } from "@/server/admin/teachers/queries";
import { updateTeacherProfileSchema, type UpdateTeacherProfileInput } from "@/server/admin/teachers/validation";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import type { TeacherListItem } from "@/server/admin/teachers/types";

const TEACHER_EMAILS_RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para administradores.",
};

function parseTeacherEmailsRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(TEACHER_EMAILS_RPC_ERROR_MESSAGES[code] ?? "No pudimos resolver los correos. Inténtalo de nuevo en unos minutos.");
}

/**
 * El email (auth.users) ya no viene de Next -- Supabase RPC directo (0022: get_user_emails,
 * SECURITY DEFINER, valida admin server-side). Sigue sin esperar a que termine el conteo de
 * salones de classroom_teachers para empezar: ambos solo necesitan los ids de profiles, así que
 * corren en Promise.all en cuanto listTeacherProfiles resuelve (performance slice 2, sin cambios
 * acá). Antes: profiles -> classroom_teachers -> emails (3 olas, la última cruzando a Next). Ahora:
 * profiles -> Promise.all(conteo, emails RPC) (2 olas, ambas contra Supabase) -- mismas 3
 * requests, ninguna duplicada, mismo shape final (TeacherListItem).
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
        supabase
          .rpc("get_user_emails", { p_user_ids: ids })
          .then(({ data, error }) => {
            if (error) throw parseTeacherEmailsRpcError(error);
            return new Map((data ?? []).map((row) => [row.user_id, row.email] as const));
          }),
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
