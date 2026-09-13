"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/auth/tempPassword";
import { updateUserProfileSchema, type UpdateUserProfileInput } from "./validation";
import type { ProfileStatus } from "./types";

export type UpdateUserProfileFieldErrors = Partial<Record<keyof UpdateUserProfileInput, string>>;
export type UpdateUserProfileActionState = { error?: string; fieldErrors?: UpdateUserProfileFieldErrors };

function revalidateUserPaths(profileId: string) {
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/estudiantes");
  revalidatePath(`/admin/usuarios/${profileId}`);
}

/**
 * Edita únicamente los 6 campos aprobados (first_name, last_name, dni, phone,
 * program_id, level). Deliberadamente NO acepta role/status: esos tienen sus propias
 * acciones dedicadas (setUserStatusAction, promoteToTeacherAction) y este action ni
 * siquiera construye un objeto de update que pudiera incluirlos.
 */
export async function updateUserProfileAction(
  profileId: string,
  formData: FormData
): Promise<UpdateUserProfileActionState> {
  await requireRole("admin");

  const rawProgramId = formData.get("program_id");
  const parsed = updateUserProfileSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dni: formData.get("dni"),
    phone: formData.get("phone"),
    level: formData.get("level"),
    program_id: rawProgramId && rawProgramId !== "" ? Number(rawProgramId) : null,
  });

  if (!parsed.success) {
    const fieldErrors: UpdateUserProfileFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof UpdateUserProfileFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const { first_name, last_name, dni, phone, level, program_id } = parsed.data;

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name, last_name, dni, phone, level, program_id })
    .eq("id", profileId);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { dni: "Este DNI ya está registrado en otro usuario." } };
    }
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };
  }

  revalidateUserPaths(profileId);
  return {};
}

export type SetUserStatusActionState = { error?: string };

/** Un admin no puede desactivar su propio perfil desde esta interfaz (regla de producto,
 * no solo de RLS): se corta antes de tocar la base de datos. */
export async function setUserStatusAction(profileId: string, status: ProfileStatus): Promise<SetUserStatusActionState> {
  const profile = await requireRole("admin");

  if (profile.id === profileId && status === "inactive") {
    return { error: "No puedes desactivar tu propio perfil." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);

  if (error) {
    return { error: "No pudimos actualizar el estado. Inténtalo de nuevo en unos minutos." };
  }

  revalidateUserPaths(profileId);
  return {};
}

export type PromoteToTeacherActionState = { error?: string };

const RPC_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  PROFILE_NOT_FOUND: "El perfil no existe.",
  PROFILE_INACTIVE: "El perfil está inactivo; actívalo antes de promoverlo a docente.",
  ADMIN_CANNOT_BE_CONVERTED: "Un administrador no puede convertirse en docente.",
  INVALID_RATE: "La tarifa por hora no puede ser negativa.",
};

/** Única transición de rol disponible en esta interfaz: student -> teacher, exclusivamente
 * vía el RPC ya auditado promote_user_to_teacher(). Nunca se hace UPDATE profiles.role. */
export async function promoteToTeacherAction(profileId: string, hourlyRate: number): Promise<PromoteToTeacherActionState> {
  await requireRole("admin");

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { error: "Ingresa una tarifa por hora válida." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("promote_user_to_teacher", {
    p_target_profile_id: profileId,
    p_initial_hourly_rate: hourlyRate,
  });

  if (error) {
    const code = error.message.split(":")[0] ?? "";
    return { error: RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la promoción a docente." };
  }

  revalidateUserPaths(profileId);
  return {};
}

export type ResetStudentTempPasswordActionState = {
  error?: string;
  success?: { tempPassword: string };
};

/**
 * Regenera la contraseña temporal de un estudiante (caso: se perdió la pantalla de éxito de
 * createStudentAction y la original quedó irrecuperable, ya que nunca se persiste). Orden
 * deliberado: primero auth.admin.updateUserById() (Admin API); solo si eso tiene éxito se llama
 * a admin_reset_student_password_flag() para volver a marcar must_change_password=true -- así,
 * si el cambio de contraseña en Auth falla, nunca se llega a mostrar ni a marcar nada. Si en
 * cambio Auth tiene éxito pero el RPC falla, la contraseña sí es válida (ya está en Auth) y se
 * muestra igual, pero con una advertencia explícita en vez de fallar en silencio -- ver el bloque
 * de error correspondiente más abajo.
 */
export async function resetStudentTempPasswordAction(profileId: string): Promise<ResetStudentTempPasswordActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError || !target) {
    return { error: "El perfil no existe." };
  }
  if (target.role !== "student") {
    return { error: "Esta acción solo aplica a estudiantes." };
  }

  const tempPassword = generateTempPassword();

  const adminAuthClient = createAdminClient();
  const { error: updateAuthError } = await adminAuthClient.auth.admin.updateUserById(profileId, {
    password: tempPassword,
  });

  if (updateAuthError) {
    return { error: "No pudimos cambiar la contraseña. Inténtalo de nuevo en unos minutos." };
  }

  const { error: flagError } = await supabase.rpc("admin_reset_student_password_flag", {
    p_target_id: profileId,
  });

  if (flagError) {
    // La contraseña YA cambió en Auth -- es real y hay que mostrarla -- pero no pudimos marcar
    // must_change_password=true. Se reporta la inconsistencia en vez de ocultarla: el estudiante
    // podrá entrar con esta contraseña sin que se le fuerce a cambiarla todavía.
    console.error(
      `[resetStudentTempPasswordAction] la contraseña de Auth para ${profileId} cambió, pero admin_reset_student_password_flag falló.`,
      flagError
    );
    return {
      error:
        "La contraseña se cambió, pero no pudimos marcarla como temporal. Entrégala igual y vuelve a intentar esta acción en unos minutos.",
      success: { tempPassword },
    };
  }

  revalidateUserPaths(profileId);
  return { success: { tempPassword } };
}
