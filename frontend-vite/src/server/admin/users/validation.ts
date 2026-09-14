import { z } from "zod";
import { ACADEMIC_LEVELS, type AcademicLevel } from "./types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

export const updateUserProfileSchema = z.object({
  first_name: requiredText("El nombre"),
  last_name: requiredText("El apellido"),
  dni: requiredText("El DNI"),
  phone: requiredText("El teléfono"),
  level: z.enum(ACADEMIC_LEVELS as [AcademicLevel, ...AcademicLevel[]]),
  // "" desde el <select> significa "sin programa" -- se traduce a null antes de llegar aquí.
  program_id: z.number().int().positive().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
