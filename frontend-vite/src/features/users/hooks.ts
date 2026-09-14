import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { secureApiCall } from "@/lib/apiClient";
import { listUsers, getUserDetail, getRoleChanges, listPrograms } from "@/server/admin/users/queries";
import { updateUserProfileSchema, type UpdateUserProfileInput } from "@/server/admin/users/validation";
import type { ProfileStatus, UserListFilters } from "@/server/admin/users/types";

export function useUsers(filters: UserListFilters) {
  return useQuery({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: () => listUsers(supabase, filters),
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.adminUserDetail(id),
    queryFn: () => getUserDetail(supabase, id),
    enabled: !!id,
  });
}

export function useRoleChanges(profileId: string) {
  return useQuery({
    queryKey: queryKeys.adminRoleChanges(profileId),
    queryFn: () => getRoleChanges(supabase, profileId),
    enabled: !!profileId,
  });
}

export function usePrograms(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: queryKeys.adminPrograms(options?.activeOnly),
    queryFn: () => listPrograms(supabase, options),
  });
}

function invalidateUserQueries(queryClient: ReturnType<typeof useQueryClient>, profileId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminUserDetail(profileId) });
}

export type UpdateUserProfileFieldErrors = Partial<Record<keyof UpdateUserProfileInput, string>>;

/**
 * Edita únicamente los 6 campos aprobados (first_name, last_name, dni, phone, program_id, level)
 * -- browser-direct porque protect_profile_update (0012) da vía libre a los admins para cualquier
 * campo, pero este mutationFn deliberadamente nunca construye un payload con role/status: esos
 * tienen sus propios flujos (useSetUserStatus, usePromoteToTeacher), portado de
 * updateUserProfileAction (server/admin/users/actions.ts).
 */
export function useUpdateUserProfile(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateUserProfileInput) => {
      const parsed = updateUserProfileSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: UpdateUserProfileFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof UpdateUserProfileFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: UpdateUserProfileFieldErrors };
      }
      const { first_name, last_name, dni, phone, level, program_id } = parsed.data;
      const { error } = await supabase
        .from("profiles")
        .update({ first_name, last_name, dni, phone, level, program_id })
        .eq("id", profileId);
      if (error) {
        if (error.code === "23505") {
          throw { fieldErrors: { dni: "Este DNI ya está registrado en otro usuario." } } as { fieldErrors: UpdateUserProfileFieldErrors };
        }
        throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
      }
    },
    onSuccess: () => invalidateUserQueries(queryClient, profileId),
  });
}

/**
 * profiles.status -- browser-direct, mismo trigger que arriba. La regla "un admin no puede
 * desactivar su propio perfil" es de producto, no de RLS: se corta client-side antes de llamar,
 * igual que en setUserStatusAction.
 */
export function useSetUserStatus(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ status, isSelf }: { status: ProfileStatus; isSelf: boolean }) => {
      if (isSelf && status === "inactive") {
        throw new Error("No puedes desactivar tu propio perfil.");
      }
      const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);
      if (error) throw new Error("No pudimos actualizar el estado. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateUserQueries(queryClient, profileId),
  });
}

const PROMOTE_RPC_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  PROFILE_NOT_FOUND: "El perfil no existe.",
  PROFILE_INACTIVE: "El perfil está inactivo; actívalo antes de promoverlo a docente.",
  ADMIN_CANNOT_BE_CONVERTED: "Un administrador no puede convertirse en docente.",
  INVALID_RATE: "La tarifa por hora no puede ser negativa.",
};

/** Única transición de rol disponible en esta interfaz: student -> teacher, vía RPC directo
 * promote_user_to_teacher() -- nunca un UPDATE profiles.role directo. */
export function usePromoteToTeacher(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hourlyRate: number) => {
      if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
        throw new Error("Ingresa una tarifa por hora válida.");
      }
      const { error } = await supabase.rpc("promote_user_to_teacher", {
        p_target_profile_id: profileId,
        p_initial_hourly_rate: hourlyRate,
      });
      if (error) {
        const code = error.message.split(":")[0] ?? "";
        throw new Error(PROMOTE_RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la promoción a docente.");
      }
    },
    onSuccess: () => invalidateUserQueries(queryClient, profileId),
  });
}

/**
 * Backend seguro -- requiere auth.admin.updateUserById() (service_role), nunca puede ir
 * browser-direct. Ver src/app/api/admin/users/[id]/reset-password/route.ts (Next).
 */
export function useResetTempPassword(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => secureApiCall<{ tempPassword: string }>(`/api/admin/users/${profileId}/reset-password`, { method: "POST" }),
    onSuccess: () => invalidateUserQueries(queryClient, profileId),
  });
}

const USER_EMAILS_RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para administradores.",
};

function parseUserEmailsRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(USER_EMAILS_RPC_ERROR_MESSAGES[code] ?? "No pudimos resolver los correos. Inténtalo de nuevo en unos minutos.");
}

/**
 * Resolución de emails (profiles no tiene columna email, solo vive en auth.users) -- Supabase RPC
 * directo (0022: get_user_emails), ya no pasa por Next. SECURITY DEFINER + chequeo de
 * auth.uid()/profiles.role='admin' dentro de la función (nunca en el cliente); ids que no
 * corresponden a ninguna fila simplemente no aparecen en `emails` -- mismo comportamiento que el
 * Route Handler que reemplaza, los consumidores ya normalizan con `emails[id] ?? null`.
 * Reutilizado tanto por Docentes (listado + detalle) como por Paquetes.
 */
export function useUserEmails(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.adminUserEmails(ids),
    queryFn: async (): Promise<{ emails: Record<string, string | null> }> => {
      const { data, error } = await supabase.rpc("get_user_emails", { p_user_ids: ids });
      if (error) throw parseUserEmailsRpcError(error);

      const emails: Record<string, string | null> = {};
      for (const row of data ?? []) {
        emails[row.user_id] = row.email;
      }
      return { emails };
    },
    enabled: ids.length > 0,
  });
}
