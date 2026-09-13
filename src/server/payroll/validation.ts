import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

export const createPayrollPeriodSchema = z
  .object({
    teacherId: z.string().uuid("Selecciona un docente"),
    periodStart: dateString,
    periodEnd: dateString,
  })
  .refine((v) => v.periodEnd >= v.periodStart, { message: "La fecha de fin debe ser mayor o igual a la de inicio", path: ["periodEnd"] });

export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;
