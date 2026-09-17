/**
 * Etiquetas en español para `class_schedules.day_of_week`: índice 0 = domingo, 1 = lunes, ...,
 * 6 = sábado -- igual que `Date.getDay()`/`EXTRACT(DOW)` de Postgres.
 */
export const DAY_OF_WEEK_LABELS: readonly string[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface ClassScheduleItem {
  id: number;
  classroomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}
