import { authenticateBearer } from "@/lib/supabase/bearer";
import { jsonResponse, handleOptions } from "@/lib/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/auth/tempPassword";
import { createStudentSchema } from "@/server/admin/students/validation";
import { requireAdminBearer } from "../guard";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

const PROVISION_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  INVALID_TARGET: "Ocurrió un error interno al crear el estudiante.",
  PROGRAM_NOT_FOUND: "El programa seleccionado no existe.",
};

/**
 * POST /api/admin/students -- portado literal de createStudentAction (server/admin/students/
 * actions.ts): auth.admin.createUser() (service_role, requiere backend) + RPC
 * admin_provision_student_profile(), con la misma compensación (borrar el usuario de Auth recién
 * creado) si el segundo paso falla. Mismo Zod schema reutilizado tal cual desde el proyecto Next
 * -- nunca duplicado. La contraseña temporal solo viaja en la respuesta HTTP, nunca se persiste.
 */
export async function POST(request: Request) {
  const auth = await authenticateBearer(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const guard = await requireAdminBearer(auth.supabase, auth.userId);
  if (!guard.ok) return jsonResponse({ error: guard.error }, guard.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la petición inválido (se esperaba JSON)." }, 400);
  }

  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors }, 400);
  }
  const { first_name, last_name, dni, phone, email, program_id, level } = parsed.data;

  const { data: existingDni, error: dniCheckError } = await auth.supabase.from("profiles").select("id").eq("dni", dni).maybeSingle();
  if (dniCheckError) return jsonResponse({ error: "No pudimos validar el DNI. Inténtalo de nuevo en unos minutos." }, 500);
  if (existingDni) return jsonResponse({ error: "Este DNI ya está registrado en otro usuario.", fieldErrors: { dni: "Ya registrado." } }, 409);

  const tempPassword = generateTempPassword();
  const adminAuthClient = createAdminClient();

  const { data: createdUser, error: createError } = await adminAuthClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name },
  });

  if (createError) {
    if (createError.code === "email_exists") {
      return jsonResponse({ error: "Ya existe una cuenta con este correo.", fieldErrors: { email: "Ya registrado." } }, 409);
    }
    return jsonResponse({ error: "No pudimos crear la cuenta de acceso. Inténtalo de nuevo en unos minutos." }, 500);
  }

  const targetId = createdUser.user.id;

  const { error: provisionError } = await auth.supabase.rpc("admin_provision_student_profile", {
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
      console.error(`[POST /api/admin/students] compensación falló: no se pudo borrar auth.users ${targetId}.`, deleteError);
      return jsonResponse(
        {
          error:
            "Ocurrió un error al crear el estudiante y no pudimos deshacer la cuenta de acceso que se había creado. No reintentes con el mismo correo: contacta a soporte técnico primero.",
        },
        500
      );
    }

    const code = provisionError.message.split(":")[0] ?? "";
    if (code === "DNI_ALREADY_REGISTERED") {
      return jsonResponse({ error: "Este DNI ya está registrado en otro usuario.", fieldErrors: { dni: "Ya registrado." } }, 409);
    }
    return jsonResponse({ error: PROVISION_ERROR_MESSAGES[code] ?? "No pudimos completar la creación del estudiante." }, 500);
  }

  return jsonResponse({ profileId: targetId, email, tempPassword }, 201);
}
