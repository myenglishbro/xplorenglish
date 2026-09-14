import { authenticateBearer } from "@/lib/supabase/bearer";
import { jsonResponse, handleOptions } from "@/lib/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminBearer } from "../../guard";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/admin/users/emails?ids=id1,id2,...
 * Único uso de service_role de esta ruta: auth.admin.listUsers() para resolver el email de
 * profiles.id (profiles NO tiene columna email -- solo vive en auth.users). Nunca puede ir
 * browser-direct: requiere la Admin API. Mismo patrón que listTeachers() en el proyecto Next
 * (batch listUsers + Map en memoria), portado a Route Handler -- reutilizado tanto por el listado
 * de Docentes como por el detalle de un usuario individual.
 */
export async function GET(request: Request) {
  const auth = await authenticateBearer(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const guard = await requireAdminBearer(auth.supabase, auth.userId);
  if (!guard.ok) return jsonResponse({ error: guard.error }, guard.status);

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : [];
  if (ids.length === 0) return jsonResponse({ emails: {} }, 200);

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
  if (error) return jsonResponse({ error: "No pudimos resolver los correos." }, 500);

  const idSet = new Set(ids);
  const emails: Record<string, string | null> = {};
  for (const user of data.users) {
    if (idSet.has(user.id)) emails[user.id] = user.email ?? null;
  }

  return jsonResponse({ emails }, 200);
}
