import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

/** Deliberadamente solo estos 3 campos -- exactamente lo que private.protect_profile_update
 * (0012_profile_update_security.sql) deja tocar a un caller no-admin sobre `profiles`. Nunca
 * dni/level/program_id/status/role: el trigger los rechazaría igual, pero esta acción no debe
 * siquiera intentar ofrecerlos. */
export const updateMyTeacherProfileSchema = z.object({
  firstName: requiredText("El nombre"),
  lastName: requiredText("El apellido"),
  phone: requiredText("El teléfono"),
});

export type UpdateMyTeacherProfileInput = z.infer<typeof updateMyTeacherProfileSchema>;
