import { authenticateBearer } from "@/lib/supabase/bearer";
import { jsonResponse, handleOptions } from "@/lib/cors";
import { availabilityBlockSchema } from "@/server/teacher/availability/validation";
import { requireActiveTeacherId } from "../guard";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

function parseBlockId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isFinite(id) && Number.isInteger(id) ? id : null;
}

/**
 * PATCH /api/teacher/availability/:id -- edita un bloque existente.
 * Reemplaza updateAvailabilityBlockAction. .eq("teacher_id", ...) además de blockId: nunca confiar
 * en que un id de bloque ajeno no pueda colarse -- RLS ya lo bloquearía, esto lo hace explícito
 * también acá, mismo criterio defensivo que la Server Action original.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const blockId = parseBlockId(params.id);
  if (blockId === null) return jsonResponse({ error: "Id de bloque inválido." }, 400);

  const auth = await authenticateBearer(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const guard = await requireActiveTeacherId(auth.supabase, auth.userId);
  if ("error" in guard) return jsonResponse({ error: guard.error }, guard.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Cuerpo de la petición inválido (se esperaba JSON)." }, 400);
  }

  const parsed = availabilityBlockSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors }, 400);
  }

  const { error, count } = await auth.supabase
    .from("teacher_availability")
    .update({ day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime }, { count: "exact" })
    .eq("id", blockId)
    .eq("teacher_id", guard.teacherId);

  if (error) return jsonResponse({ error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." }, 500);
  if (count === 0) return jsonResponse({ error: "Bloque no encontrado." }, 404);

  return jsonResponse({ ok: true }, 200);
}

/**
 * DELETE /api/teacher/availability/:id -- reemplaza deleteAvailabilityBlockAction.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const blockId = parseBlockId(params.id);
  if (blockId === null) return jsonResponse({ error: "Id de bloque inválido." }, 400);

  const auth = await authenticateBearer(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const guard = await requireActiveTeacherId(auth.supabase, auth.userId);
  if ("error" in guard) return jsonResponse({ error: guard.error }, guard.status);

  const { error, count } = await auth.supabase
    .from("teacher_availability")
    .delete({ count: "exact" })
    .eq("id", blockId)
    .eq("teacher_id", guard.teacherId);

  if (error) return jsonResponse({ error: "No pudimos eliminar el bloque. Inténtalo de nuevo en unos minutos." }, 500);
  if (count === 0) return jsonResponse({ error: "Bloque no encontrado." }, 404);

  return jsonResponse({ ok: true }, 200);
}
