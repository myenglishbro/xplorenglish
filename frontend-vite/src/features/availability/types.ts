export interface AvailabilityBlockItem {
  id: number;
  dayOfWeek: number;
  /** "HH:MM:SS" tal como lo devuelve Postgres para una columna `time`. */
  startTime: string;
  endTime: string;
  timezone: string;
}

/** Índice 0 = domingo, igual que Date.getDay()/EXTRACT(DOW) de Postgres (mismo criterio que la
 * columna day_of_week de teacher_availability). */
export const DAY_OF_WEEK_LABELS: readonly string[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** La grilla se muestra lunes→domingo (orden natural de una semana laboral), aunque el valor
 * numérico subyacente siga la convención 0=domingo de la base de datos. */
export const WEEK_DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export interface AvailabilityBlockDraft {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** Ocupación real de un docente, DERIVADA de sus asignaciones activas a salones y el horario
 * recurrente de esos salones (class_schedules) -- nunca almacenada en teacher_availability. */
export interface OccupiedBlockItem {
  classroomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  studentName: string;
}
