import { authenticateBearer } from "@/lib/supabase/bearer";
import { jsonResponse, handleOptions } from "@/lib/cors";
import { availabilityBlockSchema } from "@/server/teacher/availability/validation";
import { requireActiveTeacherId } from "./guard";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/teacher/availability -- crea un bloque de disponibilidad.
 * Reemplaza createAvailabilityBlockAction para callers externos (SPA Vite) que no pueden invocar
 * una Server Action. Misma validación Zod, mismo guard de negocio, mismo insert -- solo cambia el
 * transporte (Bearer en vez de cookies) y el formato de request/response (JSON en vez de
 * FormData/Server Action state).
 */
export async function POST(request: Request) {
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

  // teacher_id SIEMPRE sale de guard.teacherId (resuelto del JWT verificado), nunca del body --
  // aunque el body trajera un teacher_id, availabilityBlockSchema ni siquiera lo acepta como campo.
  const { error } = await auth.supabase.from("teacher_availability").insert({
    teacher_id: guard.teacherId,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return jsonResponse({ error: "No pudimos crear el bloque. Inténtalo de nuevo en unos minutos." }, 500);

  return jsonResponse({ ok: true }, 201);
}
