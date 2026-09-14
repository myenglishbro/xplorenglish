import { z } from "zod";

/**
 * Campos exactamente los que create_hour_package acepta (0009): p_student_id, p_package_label,
 * p_total_minutes, p_price, p_payment_method, p_idempotency_key, p_currency (opcional,
 * default 'PEN' en el propio RPC), p_payment_reference (opcional). Nada más -- en particular,
 * SIN expires_at (el RPC no lo acepta ni lo fija).
 */
export const createHourPackageSchema = z.object({
  studentId: z.string().uuid("Selecciona un estudiante"),
  packageLabel: z.string().trim().min(1, "La etiqueta del paquete es obligatoria"),
  totalMinutes: z.coerce.number().int().positive("Los minutos deben ser un número positivo"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  paymentMethod: z.string().trim().min(1, "El método de pago es obligatorio"),
  currency: z.string().trim().min(1).optional().or(z.literal("")),
  paymentReference: z.string().trim().max(200).optional().or(z.literal("")),
  idempotencyKey: z.string().uuid("Falta la clave de idempotencia"),
});
export type CreateHourPackageInput = z.infer<typeof createHourPackageSchema>;
