import { z } from "zod";

// Portado literal de src/server/scheduling/validation.ts (timeString) +
// src/server/teacher/availability/validation.ts (availabilityBlockSchema). Mismo regex,
// mismas reglas -- el Route Handler seguro (Next) valida con el schema original; este es
// el mismo shape para validar en el cliente antes de enviar (UX), nunca la autoridad real.
export const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

export const availabilityBlockSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0, "Día inválido").max(6, "Día inválido"),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });

export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;
