export interface AvailabilityBlockItem {
  id: number;
  dayOfWeek: number;
  /** "HH:MM:SS" tal como lo devuelve Postgres para una columna `time` -- se recorta a "HH:MM"
   * recién en el componente que lo muestra/edita, mismo criterio que ClassScheduleItem
   * (server/scheduling/types.ts) con su start_time/end_time. */
  startTime: string;
  endTime: string;
  timezone: string;
}
