"use server";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { availabilityBlockSchema, type AvailabilityBlockInput } from "./validation";

export type AvailabilityBlockFieldErrors = Partial<Record<keyof AvailabilityBlockInput, string>>;
export type AvailabilityBlockActionState = { error?: string; fieldErrors?: AvailabilityBlockFieldErrors };

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): AvailabilityBlockFieldErrors {
  const fieldErrors: AvailabilityBlockFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key as keyof AvailabilityBlockFieldErrors] = issue.message;
  }
  return fieldErrors;
}

/**
 * teacher_id SIEMPRE sale de requireRole("teacher") (el perfil de la sesión real), nunca de un
 * parámetro que el cliente pudiera mandar -- RLS (teacher_availability_owner, 0003) ya lo
 * exigiría de todos modos, pero estas acciones no dependen solo de eso. teacher_profiles.status
 * = 'active' es el mismo criterio que start_session (0009) usa para decidir si un docente está
 * operativo: uno inactivo no puede declarar disponibilidad nueva. Devuelve el mismo shape de
 * error que las acciones ya usan (`{ error }`) para que el caller no necesite un camino aparte.
 */
async function requireActiveTeacherId(): Promise<{ teacherId: string } | { error: string }> {
  const profile = await requireRole("teacher");

  const supabase = createClient();
  const { data: teacherProfile, error } = await supabase
    .from("teacher_profiles")
    .select("status")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (error || !teacherProfile) {
    return { error: "No pudimos verificar tu perfil docente. Inténtalo de nuevo en unos minutos." };
  }
  if (teacherProfile.status !== "active") {
    return { error: "Tu perfil docente está inactivo; contacta a un administrador para reactivarlo." };
  }

  return { teacherId: profile.id };
}

function parseBlockForm(formData: FormData): { data: AvailabilityBlockInput } | { fieldErrors: AvailabilityBlockFieldErrors } {
  const parsed = availabilityBlockSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  return { data: parsed.data };
}

export async function createAvailabilityBlockAction(formData: FormData): Promise<AvailabilityBlockActionState> {
  const guard = await requireActiveTeacherId();
  if ("error" in guard) return { error: guard.error };

  const parsed = parseBlockForm(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const supabase = createClient();
  const { error } = await supabase.from("teacher_availability").insert({
    teacher_id: guard.teacherId,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return { error: "No pudimos crear el bloque. Inténtalo de nuevo en unos minutos." };

  // PILOTO 1A: sin revalidatePath -- /teacher/disponibilidad ya no lee sus datos vía Server
  // Component, así que no hay RSC que revalidar; el caller (AvailabilityBlockButton) vuelve a
  // pedir los bloques al Supabase Browser Client tras un resultado sin error.
  return {};
}

export async function updateAvailabilityBlockAction(blockId: number, formData: FormData): Promise<AvailabilityBlockActionState> {
  const guard = await requireActiveTeacherId();
  if ("error" in guard) return { error: guard.error };

  const parsed = parseBlockForm(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const supabase = createClient();
  // .eq("teacher_id", ...) además de blockId: nunca confiar en que un id de bloque ajeno no
  // pueda colarse -- RLS ya lo bloquearía, pero esta condición lo hace explícito también acá,
  // mismo criterio defensivo que el resto de las acciones admin/scheduling.
  const { error } = await supabase
    .from("teacher_availability")
    .update({ day_of_week: parsed.data.dayOfWeek, start_time: parsed.data.startTime, end_time: parsed.data.endTime })
    .eq("id", blockId)
    .eq("teacher_id", guard.teacherId);

  if (error) return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };

  return {};
}

export async function deleteAvailabilityBlockAction(blockId: number): Promise<AvailabilityBlockActionState> {
  const guard = await requireActiveTeacherId();
  if ("error" in guard) return { error: guard.error };

  const supabase = createClient();
  const { error } = await supabase.from("teacher_availability").delete().eq("id", blockId).eq("teacher_id", guard.teacherId);

  if (error) return { error: "No pudimos eliminar el bloque. Inténtalo de nuevo en unos minutos." };

  return {};
}
