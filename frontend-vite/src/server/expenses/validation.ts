import { z } from "zod";
import { EXPENSE_CATEGORIES } from "./types";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

/**
 * Espejo exacto de los constraints de 0024_business_expenses.sql -- validación aquí es solo la
 * primera barrera (mejor UX, error inmediato); el constraint `amount > 0`, el enum
 * `expense_category` y el RLS admin-only en BD son la segunda barrera real, nunca reemplazada por
 * esto. `amount` usa z.coerce.number porque el <input type="number"> del formulario entrega un
 * string a través de FormData, igual criterio que updateTeacherProfileSchema (hourlyRate).
 */
export const expenseSchema = z.object({
  expenseDate: dateString,
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: "Selecciona una categoría válida." }) }),
  description: z.string().trim().min(1, "La descripción es obligatoria."),
  amount: z.coerce.number({ invalid_type_error: "Ingresa un monto válido." }).positive("El monto debe ser mayor que 0."),
  paymentMethod: z.string().trim().min(1, "El método de pago es obligatorio."),
  // "" del textarea significa "sin observación" -- se traduce a null, mismo criterio que
  // moduleSchema.description (content/validation.ts) y updateTeacherProfileSchema.bio.
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** z.input (no z.infer): la UI pasa la forma cruda del formulario (amount como string, notes
 * opcional sin transformar) -- mismo criterio que ModuleInput/LessonInput en content/validation.ts. */
export type ExpenseInput = z.input<typeof expenseSchema>;
