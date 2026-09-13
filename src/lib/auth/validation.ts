import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

/**
 * Campos que un usuario puede enviar al registrarse. Deliberadamente NO incluye
 * role/level/status -- esos solo los define la base de datos (defaults de columna
 * en public.profiles, 0003) y complete_registration() ni siquiera los acepta como
 * parámetro.
 */
export const registerSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio").email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  first_name: requiredText("El nombre"),
  last_name: requiredText("El apellido"),
  dni: requiredText("El DNI"),
  phone: requiredText("El teléfono"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Mismos campos de negocio que el registro, sin email/password (ya hay sesión).
 * Usado tanto por /complete-profile como, conceptualmente, por el auto-completado
 * en /auth/callback.
 */
export const completeProfileSchema = z.object({
  first_name: requiredText("El nombre"),
  last_name: requiredText("El apellido"),
  dni: requiredText("El DNI"),
  phone: requiredText("El teléfono"),
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio").email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;
