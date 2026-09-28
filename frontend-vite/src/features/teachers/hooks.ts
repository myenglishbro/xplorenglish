import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  listTeacherProfiles,
  listAllTeacherProfiles,
  getActiveClassroomCounts,
  getTeacherAvailabilityByIds,
  getAllTeacherAvailabilityByIds,
  getTeacherOccupiedBlocksByIds,
  getTeacherSkillNamesByIds,
  toTeacherListItem,
} from "@/server/admin/teachers/queries";
import { updateTeacherProfileSchema, type UpdateTeacherProfileInput } from "@/server/admin/teachers/validation";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import type { TeacherListFilters, TeacherListResult } from "@/server/admin/teachers/types";
import type { AvailabilityBlockItem } from "@/features/availability/types";

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
 *
 * Paginación + búsqueda server-side (listTeacherProfiles): profiles/teacher_profiles/count llegan
 * ya acotados a 20 filas desde la DB; el conteo de salones y los emails se resuelven SOLO para esos
 * ids de la página (nunca para el universo completo de docentes) -- 3 round-trips totales por
 * página, igual que antes, ahora sobre un subconjunto en vez de todo el dataset.
 */
export function useTeachers(filters: TeacherListFilters) {
  return useQuery({
    queryKey: queryKeys.adminTeachers(filters),
    queryFn: async (): Promise<TeacherListResult> => {
      const profiles = await listTeacherProfiles(supabase, filters);
      if (profiles.items.length === 0) {
        return { items: [], totalCount: profiles.totalCount, page: profiles.page, pageSize: profiles.pageSize };
      }

      const ids = profiles.items.map((p) => p.id);
      const [countByTeacher, emailById] = await Promise.all([
        getActiveClassroomCounts(supabase, ids),
        supabase
          .rpc("get_user_emails", { p_user_ids: ids })
          .then(({ data, error }) => {
            if (error) throw parseTeacherEmailsRpcError(error);
            return new Map((data ?? []).map((row) => [row.user_id, row.email] as const));
          }),
      ]);

      return {
        items: profiles.items.map((p) => toTeacherListItem(p, countByTeacher, emailById)),
        totalCount: profiles.totalCount,
        page: profiles.page,
        pageSize: profiles.pageSize,
      };
    },
    placeholderData: keepPreviousData,
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

/**
 * Disponibilidad + niveles (skills) registrados por el docente, para el modal read-only
 * "Ver disponibilidad" de Admin > Docentes (Ajuste 5). Misma fuente de verdad (teacher_availability,
 * teacher_skills vía RLS admin) que usa la recomendación de profesores al configurar un salón.
 */
export function useTeacherAvailabilityAndSkills(teacherId: string) {
  return useQuery({
    queryKey: ["admin-teacher-availability-skills", teacherId] as const,
    queryFn: async (): Promise<{ availability: AvailabilityBlockItem[]; skillNames: string[] }> => {
      const [availabilityByTeacher, skillsByTeacher] = await Promise.all([
        getTeacherAvailabilityByIds(supabase, [teacherId]),
        getTeacherSkillNamesByIds(supabase, [teacherId]),
      ]);
      return {
        availability: availabilityByTeacher.get(teacherId) ?? [],
        skillNames: skillsByTeacher.get(teacherId) ?? [],
      };
    },
    enabled: !!teacherId,
  });
}

/** Vista conjunta de Admin > Docentes: nombres de profiles, bloques de teacher_availability
 * (disponibilidad declarada) y ocupación real derivada de class_schedules (FIX 2, segunda etapa). */
export function useAllTeacherAvailability() {
  return useQuery({
    queryKey: ["admin-all-teacher-availability"] as const,
    queryFn: async () => {
      const teachers = await listAllTeacherProfiles(supabase);
      const teacherIds = teachers.map((teacher) => teacher.id);
      const [availabilityByTeacher, occupiedByTeacher] = await Promise.all([
        getAllTeacherAvailabilityByIds(supabase, teacherIds),
        getTeacherOccupiedBlocksByIds(supabase, teacherIds),
      ]);
      return teachers.map((teacher) => ({
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        teacherStatus: teacher.teacherStatus,
        availability: availabilityByTeacher.get(teacher.id) ?? [],
        occupied: occupiedByTeacher.get(teacher.id) ?? [],
      }));
    },
  });
}

export type UpdateTeacherProfileFieldErrors = Partial<Record<keyof UpdateTeacherProfileInput, string>>;

/**
 * Solo edita teacher_profiles (hourly_rate/bio/status/receipt_drive_url) -- browser-direct,
 * teacher_profiles_admin_write (0003) da a los admins escritura total sobre esta tabla. Nunca
 * profiles.role ni classroom_teachers. receipt_drive_url (FIX 2, segunda etapa): Xplore solo
 * guarda y abre esta URL, nunca sube ni verifica archivos de Drive.
 */
export function useUpdateTeacherProfile(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { hourlyRate: unknown; bio: unknown; status: unknown; receiptDriveUrl: unknown }) => {
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

      const { hourlyRate, bio, status, receiptDriveUrl } = parsed.data;
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ hourly_rate: hourlyRate, bio, status, receipt_drive_url: receiptDriveUrl })
        .eq("profile_id", profileId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserDetail(profileId) });
    },
  });
}
