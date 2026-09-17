import { z } from "zod";

export const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

export const classScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });
export type ClassScheduleInput = z.infer<typeof classScheduleSchema>;
