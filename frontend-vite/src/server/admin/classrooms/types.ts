import type { Database } from "@/types/database.types";

export type AcademicLevel = Database["public"]["Enums"]["academic_level"];
export type ClassroomTeacherRole = Database["public"]["Enums"]["classroom_teacher_role"];
// classrooms.status es `text` con CHECK (0005), no un enum real de Postgres.
export type ClassroomStatus = "active" | "archived";

export interface ClassroomListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (componente genérico del
  // Design System); no relaja el tipado de los accesos nombrados abajo.
  [key: string]: unknown;
  id: number;
  name: string;
  programId: number;
  programName: string;
  level: AcademicLevel;
  status: ClassroomStatus;
  primaryTeacherName: string | null;
  studentCount: number;
}

export interface ClassroomListFilters {
  programId?: number;
  level?: AcademicLevel | "all";
  status?: ClassroomStatus | "all";
}

export interface TeacherMembership {
  teacherId: string;
  firstName: string;
  lastName: string;
  role: ClassroomTeacherRole;
}

export interface StudentMembership {
  // Índice requerido por DataTable<T extends Record<string, unknown>>; ver ClassroomListItem.
  [key: string]: unknown;
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
  teachers: TeacherMembership[];
  students: StudentMembership[];
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
