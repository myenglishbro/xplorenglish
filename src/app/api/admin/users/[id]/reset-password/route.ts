import { authenticateBearer } from "@/lib/supabase/bearer";
import { jsonResponse, handleOptions } from "@/lib/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/auth/tempPassword";
import { requireAdminBearer } from "../../../guard";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/admin/users/:id/reset-password
 * Portado de resetStudentTempPasswordAction (server/admin/users/actions.ts) -- mismo orden
 * exacto: primero auth.admin.updateUserById() (Admin API, requiere service_role), solo si eso
 * tiene éxito se llama a admin_reset_student_password_flag() (RPC) para volver a marcar
 * must_change_password=true. Nunca puede ir browser-direct: cambiar la contraseña de OTRO usuario
 * en Auth exige service_role, sin excepción.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateBearer(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const guard = await requireAdminBearer(auth.supabase, auth.userId);
  if (!guard.ok) return jsonResponse({ error: guard.error }, guard.status);

  const profileId = params.id;

  const { data: target, error: targetError } = await auth.supabase.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (targetError || !target) return jsonResponse({ error: "El perfil no existe." }, 404);
  if (target.role !== "student") return jsonResponse({ error: "Esta acción solo aplica a estudiantes." }, 400);

  const tempPassword = generateTempPassword();

  const adminAuthClient = createAdminClient();
  const { error: updateAuthError } = await adminAuthClient.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (updateAuthError) {
    return jsonResponse({ error: "No pudimos cambiar la contraseña. Inténtalo de nuevo en unos minutos." }, 500);
  }

  const { error: flagError } = await auth.supabase.rpc("admin_reset_student_password_flag", { p_target_id: profileId });
  if (flagError) {
    console.error(`[reset-password] contraseña de Auth cambió para ${profileId}, pero el flag RPC falló.`, flagError);
    return jsonResponse(
      {
        error: "La contraseña se cambió, pero no pudimos marcarla como temporal. Entrégala igual y reintenta esta acción en unos minutos.",
        tempPassword,
      },
      207
    );
  }

  return jsonResponse({ tempPassword }, 200);
}
