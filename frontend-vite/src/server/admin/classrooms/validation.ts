import { z } from "zod";
import { ACADEMIC_LEVELS, type AcademicLevel } from "@/server/admin/users/types";

export const classroomSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  program_id: z.number({ invalid_type_error: "Selecciona un programa" }).int().positive("Selecciona un programa"),
  level: z.enum(ACADEMIC_LEVELS as [AcademicLevel, ...AcademicLevel[]], { errorMap: () => ({ message: "Selecciona un nivel" }) }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  schedule_notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type ClassroomInput = z.infer<typeof classroomSchema>;
