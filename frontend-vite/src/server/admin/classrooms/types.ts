import type { Database } from "@/types/database.types";

export type AcademicLevel = Database["public"]["Enums"]["academic_level"];
// classrooms.status es `text` con CHECK (0005), no un enum real de Postgres.
export type ClassroomStatus = "active" | "archived";

export interface ClassroomListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que el resto de *ListItem del proyecto.
  [key: string]: unknown;
  id: number;
  name: string;
  programId: number;
  programName: string;
  level: AcademicLevel;
  status: ClassroomStatus;
  studentName: string | null;
  /** SUM(hours_movements.minutes_delta) del estudiante asignado (Slice G) -- null si el salón no
   * tiene estudiante. Nunca desde hours_packages.remaining_minutes. */
  studentBalance: number | null;
  enabledTeacherCount: number;
}

export interface ClassroomListFilters {
  programId?: number;
  level?: AcademicLevel | "all";
  status?: ClassroomStatus | "all";
}

/** Sin PRIMARY/SUBSTITUTE (Slice A) -- cualquier fila activa es un profesor habilitado. */
export interface TeacherMembership {
  teacherId: string;
  firstName: string;
  lastName: string;
}

export interface ClassroomStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  dni: string;
}

export interface ClassroomDetail {
  id: number;
  name: string;
  programId: number;
  programName: string;
  level: AcademicLevel;
  description: string | null;
  scheduleNotes: string | null;
  status: ClassroomStatus;
  /** classrooms.student_id -- null si el salón todavía no tiene alumno asignado. */
  student: ClassroomStudent | null;
  teachers: TeacherMembership[];
}

export interface AssignableTeacher {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AssignableStudent {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
}
