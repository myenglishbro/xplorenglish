import { z } from "zod";
import { timeString } from "@/server/scheduling/validation";

/**
 * Mismo shape y mismo timeString (HH:MM) que classScheduleSchema (server/scheduling/validation.ts)
 * para class_schedules -- teacher_availability es estructuralmente la misma idea (bloque semanal
 * recurrente día+horario), solo que por docente en vez de por salón. timezone NO se acepta acá:
 * la columna tiene default 'America/Lima' y este MVP no ofrece elegirla desde la UI.
 */
export const availabilityBlockSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0, "Día inválido").max(6, "Día inválido"),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });

export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;
