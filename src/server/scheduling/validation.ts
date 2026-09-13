import { z } from "zod";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "./types";

// Exportado: server/teacher/availability/validation.ts lo reutiliza tal cual para
// teacher_availability (mismo formato HH:MM que class_schedules) -- nunca duplicar el regex.
export const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

export const classScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });
export type ClassScheduleInput = z.infer<typeof classScheduleSchema>;

export const createSessionSchema = z
  .object({
    classroomId: z.coerce.number().int().positive(),
    scheduledTeacherId: z.string().uuid("Selecciona un docente"),
    date: dateString,
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const generateSessionsSchema = z
  .object({
    classroomId: z.coerce.number().int().positive(),
    dateFrom: dateString,
    dateTo: dateString,
  })
  .refine((v) => v.dateTo >= v.dateFrom, { message: "El rango de fechas es inválido", path: ["dateTo"] });
export type GenerateSessionsInput = z.infer<typeof generateSessionsSchema>;

export const rescheduleSchema = z
  .object({
    date: dateString,
    startTime: timeString,
    endTime: timeString,
    newTeacherId: z.string().uuid().optional().or(z.literal("")),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.endTime > v.startTime, { message: "La hora de fin debe ser mayor que la de inicio", path: ["endTime"] });
export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export const changeTeacherSchema = z.object({
  newTeacherId: z.string().uuid("Selecciona un docente"),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ChangeTeacherInput = z.infer<typeof changeTeacherSchema>;

/** attendanceStatus se valida contra los 4 valores reales del enum -- el RPC (set_student_session_billing)
 * es la única autoridad de qué transición es válida para el estado de la sesión; esto solo evita
 * enviar un string arbitrario. */
export const billingSchema = z.object({
  attendanceStatus: z.string().refine((v): v is AttendanceStatus => (ATTENDANCE_STATUSES as string[]).includes(v), "Estado inválido"),
  minutesCharged: z.coerce.number().int().min(0, "Los minutos no pueden ser negativos"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type BillingInput = z.infer<typeof billingSchema>;
