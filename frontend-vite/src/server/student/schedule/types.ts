/** Bloque del horario semanal REFERENCIAL de un salón (class_schedules) del alumno autenticado --
 * FIX 7, segunda etapa. NUNCA class_records (historial de lo que realmente ocurrió). teacherNames
 * puede tener más de un nombre (el modelo permite varios docentes habilitados por salón, sin
 * distinción de titular/suplente) -- nunca se elige uno como "principal". */
export interface MyStudentScheduleBlock {
  id: number;
  classroomId: number;
  classroomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherNames: string[];
}
