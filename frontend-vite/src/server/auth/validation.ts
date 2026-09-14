import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

/**
 * Autorregistro público (/register). Mismas reglas de first_name/last_name/dni/phone/email/
 * program_id que createStudentSchema (server/admin/students/validation.ts) -- son el mismo modelo
 * de datos (public.profiles) -- más password/confirmPassword, que el flujo administrativo no
 * necesita (ese genera una contraseña temporal en el servidor). role/level/status nunca son
 * parte de este schema: complete_registration() (0011) los fija ella misma (student/A1/active),
 * el cliente no puede especificarlos.
 */
export const registerSchema = z
  .object({
    first_name: requiredText("El nombre"),
    last_name: requiredText("El apellido"),
    dni: requiredText("El DNI"),
    phone: requiredText("El teléfono"),
    email: z.string().trim().min(1, "El correo es obligatorio").email("Ingresa un correo válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    program_id: z
      .number({ required_error: "Selecciona un programa", invalid_type_error: "Selecciona un programa" })
      .int()
      .positive("Selecciona un programa"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
