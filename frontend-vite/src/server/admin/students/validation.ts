import { z } from "zod";
import { ACADEMIC_LEVELS, type AcademicLevel } from "@/server/admin/users/types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

export const createStudentSchema = z.object({
  first_name: requiredText("El nombre"),
  last_name: requiredText("El apellido"),
  dni: requiredText("El DNI"),
  phone: requiredText("El teléfono"),
  email: z.string().trim().min(1, "El correo es obligatorio").email("Ingresa un correo válido"),
  program_id: z
    .number({ required_error: "Selecciona un programa", invalid_type_error: "Selecciona un programa" })
    .int()
    .positive("Selecciona un programa"),
  level: z.enum(ACADEMIC_LEVELS as [AcademicLevel, ...AcademicLevel[]]),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
