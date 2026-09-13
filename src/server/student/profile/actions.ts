"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateMyStudentProfileSchema, type UpdateMyStudentProfileInput } from "./validation";

export type UpdateMyStudentProfileFieldErrors = Partial<Record<keyof UpdateMyStudentProfileInput, string>>;
export type UpdateMyStudentProfileActionState = { error?: string; fieldErrors?: UpdateMyStudentProfileFieldErrors };

/**
 * Acción angosta a propósito: el propio estudiante edita SOLO first_name/last_name/phone en
 * profiles -- exactamente lo que private.protect_profile_update (trigger BEFORE UPDATE,
 * 0012_profile_update_security.sql) deja tocar a un caller no-admin. El objeto de `update` se
 * arma acá explícitamente con esas 3 columnas nombradas, nunca desde un spread más ancho del
 * FormData -- aunque alguien lograra colar otro campo, el trigger lo rechazaría igual
 * (PROFILE_FIELD_LOCKED), pero esta acción no depende de esa segunda línea de defensa para
 * decidir qué es editable. No reutiliza updateUserProfileAction (admin/users): esa es
 * admin-only y su superficie incluye dni/level/program_id, que un estudiante no puede tocar.
 *
 * profileId SIEMPRE sale de requireRole("student") (el perfil de la sesión real), nunca de un
 * parámetro que el cliente pudiera mandar.
 */
export async function updateMyStudentProfileAction(formData: FormData): Promise<UpdateMyStudentProfileActionState> {
  const profile = await requireRole("student");

  const parsed = updateMyStudentProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: UpdateMyStudentProfileFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof UpdateMyStudentProfileFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone })
    .eq("id", profile.id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };
  }

  revalidatePath("/student/perfil");
  return {};
}
