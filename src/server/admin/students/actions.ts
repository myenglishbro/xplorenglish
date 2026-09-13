"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/auth/tempPassword";
import { createStudentSchema, type CreateStudentInput } from "./validation";

export type CreateStudentFieldErrors = Partial<Record<keyof CreateStudentInput, string>>;

export type CreateStudentActionState = {
  error?: string;
  fieldErrors?: CreateStudentFieldErrors;
  success?: { profileId: string; email: string; tempPassword: string };
};

const PROVISION_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  INVALID_TARGET: "Ocurrió un error interno al crear el estudiante.",
  PROGRAM_NOT_FOUND: "El programa seleccionado no existe.",
};

/**
 * Crea un estudiante desde Admin: auth.admin.createUser() (crea la identidad en Auth con una
 * contraseña temporal generada por el servidor, email_confirm=true, SIN enviar ningún correo)
 * seguido de admin_provision_student_profile() (crea profiles con must_change_password=true, con
 * la sesión normal del admin -- nunca service_role para esto). Si el segundo paso falla, se
 * compensa borrando el usuario de Auth recién creado para no dejar una identidad huérfana; si la
 * propia compensación falla, se reporta sin ocultarlo (ver bloque de error correspondiente más
 * abajo). La contraseña temporal solo vive en el `success` de esta Server Action -- nunca se
 * persiste, nunca se loguea -- el admin debe copiarla y entregarla ahora: no se puede recuperar
 * después (ver admin_reset_student_password_flag para ese caso).
 */
export async function createStudentAction(formData: FormData): Promise<CreateStudentActionState> {
  await requireRole("admin");

  const rawProgramId = formData.get("program_id");
  const parsed = createStudentSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dni: formData.get("dni"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    program_id: rawProgramId && rawProgramId !== "" ? Number(rawProgramId) : undefined,
    level: formData.get("level"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateStudentFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof CreateStudentFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const { first_name, last_name, dni, phone, email, program_id, level } = parsed.data;

  const supabase = createClient();

  // Pre-check de DNI: evita crear una identidad de Auth (y su contraseña temporal) en el caso
  // común de un DNI duplicado. No es la defensa final -- esa la sigue haciendo profiles_dni_uidx
  // dentro del RPC (ver más abajo), por si hay una carrera entre este SELECT y el INSERT real.
  const { data: existingDni, error: dniCheckError } = await supabase
    .from("profiles")
    .select("id")
    .eq("dni", dni)
    .maybeSingle();

  if (dniCheckError) {
    return { error: "No pudimos validar el DNI. Inténtalo de nuevo en unos minutos." };
  }
  if (existingDni) {
    return { fieldErrors: { dni: "Este DNI ya está registrado en otro usuario." } };
  }

  const tempPassword = generateTempPassword();

  const adminAuthClient = createAdminClient();
  const { data: createdUser, error: createError } = await adminAuthClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name },
  });

  if (createError) {
    // Códigos estructurados de Supabase Auth (error.code), nunca comparación de texto sobre
    // error.message -- ver auditoría previa.
    if (createError.code === "email_exists") {
      return { fieldErrors: { email: "Ya existe una cuenta con este correo." } };
    }
    return { error: "No pudimos crear la cuenta de acceso. Inténtalo de nuevo en unos minutos." };
  }

  const targetId = createdUser.user.id;

  const { error: provisionError } = await supabase.rpc("admin_provision_student_profile", {
    p_target_id: targetId,
    p_first_name: first_name,
    p_last_name: last_name,
    p_dni: dni,
    p_phone: phone,
    p_program_id: program_id,
    p_level: level,
  });

  if (provisionError) {
    const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(targetId);

    if (deleteError) {
      console.error(
        `[createStudentAction] compensación falló: no se pudo borrar auth.users ${targetId} tras un provisioning fallido.`,
        deleteError
      );
      return {
        error:
          "Ocurrió un error al crear el estudiante y no pudimos deshacer la cuenta de acceso que se había creado. No reintentes con el mismo correo: contacta a soporte técnico primero.",
      };
    }

    const code = provisionError.message.split(":")[0] ?? "";
    if (code === "DNI_ALREADY_REGISTERED") {
      return { fieldErrors: { dni: "Este DNI ya está registrado en otro usuario." } };
    }
    return { error: PROVISION_ERROR_MESSAGES[code] ?? "No pudimos completar la creación del estudiante. Inténtalo de nuevo." };
  }

  revalidatePath("/admin/estudiantes");
  revalidatePath("/admin/usuarios");

  return { success: { profileId: targetId, email, tempPassword } };
}
