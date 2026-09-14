// Portado literal de src/server/teacher/availability/types.ts (Next). Mismo shape exacto.

export interface AvailabilityBlockItem {
  id: number;
  dayOfWeek: number;
  /** "HH:MM:SS" tal como lo devuelve Postgres para una columna `time` -- se recorta a "HH:MM"
   * recién en el componente que lo muestra/edita, mismo criterio que en el proyecto Next. */
  startTime: string;
  endTime: string;
  timezone: string;
}

/** Portado de src/server/scheduling/types.ts (DAY_OF_WEEK_LABELS) -- índice 0 = domingo,
 * igual que Date.getDay()/EXTRACT(DOW) de Postgres. */
export const DAY_OF_WEEK_LABELS: readonly string[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
