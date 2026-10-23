import { z } from "zod";
import { normalizePhotoUrl } from "@/lib/images/photoUrl";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

/** Deliberadamente solo estos campos (nombre, apellido, teléfono y foto) -- exactamente lo que private.protect_profile_update
 * (0012_profile_update_security.sql) deja tocar a un caller no-admin sobre `profiles`. Nunca
 * dni/level/program_id/status/role: el trigger los rechazaría igual, pero esta acción no debe
 * siquiera intentar ofrecerlos. */
export const updateMyTeacherProfileSchema = z.object({
  firstName: requiredText("El nombre"),
  lastName: requiredText("El apellido"),
  phone: requiredText("El teléfono"),
  // Vacío = quitar la foto. Los enlaces de Google Drive se convierten a su miniatura directa.
  photoUrl: z
    .string()
    .trim()
    .default("")
    .transform((v, ctx) => {
      if (!v) return null;
      const normalized = normalizePhotoUrl(v);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pega un enlace https válido de una imagen (o de Google Drive)" });
        return z.NEVER;
      }
      return normalized;
    }),
});

export type UpdateMyTeacherProfileInput = z.infer<typeof updateMyTeacherProfileSchema>;
export type UpdateMyTeacherProfileFormInput = z.input<typeof updateMyTeacherProfileSchema>;
