/** Bloque del horario semanal REFERENCIAL de un salón (class_schedules) donde el docente
 * autenticado está habilitado activamente -- FIX 7, segunda etapa. NUNCA class_records (eso es
 * historial de lo que realmente ocurrió) ni teacher_availability (eso es disponibilidad declarada,
 * un concepto distinto). */
export interface MyTeacherScheduleBlock {
  id: number;
  classroomId: number;
  classroomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** null si el salón todavía no tiene alumno asignado. */
  studentName: string | null;
}
