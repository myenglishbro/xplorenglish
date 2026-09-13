import { z } from "zod";

export const updateTeacherProfileSchema = z.object({
  hourlyRate: z.coerce.number({ invalid_type_error: "Ingresa una tarifa válida." }).min(0, "La tarifa no puede ser negativa."),
  // "" del textarea significa "sin bio" -- se traduce a null, igual criterio que program_id en
  // server/admin/users/validation.ts.
  bio: z
    .string()
    .trim()
    .max(2000, "Máximo 2000 caracteres.")
    .transform((v) => (v.length > 0 ? v : null))
    .nullable(),
  status: z.enum(["active", "inactive"], { errorMap: () => ({ message: "Estado inválido." }) }),
});

export type UpdateTeacherProfileInput = z.infer<typeof updateTeacherProfileSchema>;
