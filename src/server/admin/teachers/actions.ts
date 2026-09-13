"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateTeacherProfileSchema, type UpdateTeacherProfileInput } from "./validation";

export type UpdateTeacherProfileFieldErrors = Partial<Record<keyof UpdateTeacherProfileInput, string>>;
export type UpdateTeacherProfileActionState = { error?: string; fieldErrors?: UpdateTeacherProfileFieldErrors };

/**
 * Edita únicamente teacher_profiles (hourly_rate/bio/status) -- nunca profiles.role ni
 * classroom_teachers. Cambiar asignaciones de salón sigue siendo exclusivo de
 * /admin/salones/[id] (assignPrimaryTeacherAction y compañía, sin duplicar acá).
 */
export async function updateTeacherProfileAction(
  profileId: string,
  formData: FormData
): Promise<UpdateTeacherProfileActionState> {
  await requireRole("admin");

  const supabase = createClient();

  // Confirma que el target sigue siendo teacher antes de tocar teacher_profiles -- misma
  // precaución que promoteToTeacherAction, aunque acá no hay transición de rol de por medio.
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (profileError) {
    return { error: "No pudimos verificar el perfil. Inténtalo de nuevo en unos minutos." };
  }
  if (!profile || profile.role !== "teacher") {
    return { error: "Este usuario no es un docente." };
  }

  const parsed = updateTeacherProfileSchema.safeParse({
    hourlyRate: formData.get("hourlyRate"),
    bio: formData.get("bio"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const fieldErrors: UpdateTeacherProfileFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof UpdateTeacherProfileFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const { hourlyRate, bio, status } = parsed.data;

  const { error } = await supabase
    .from("teacher_profiles")
    .update({ hourly_rate: hourlyRate, bio, status })
    .eq("profile_id", profileId);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };
  }

  revalidatePath("/admin/docentes");
  revalidatePath(`/admin/docentes/${profileId}`);
  return {};
}
