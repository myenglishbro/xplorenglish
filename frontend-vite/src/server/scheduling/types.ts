import type { Database } from "@/types/database.types";

export type SessionStatus = Database["public"]["Enums"]["session_status"];
export type SessionTeacherChangeType = Database["public"]["Enums"]["session_teacher_change_type"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ["present", "absent", "cancelled", "rescheduled"];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

/**
 * Etiquetas en español para `class_schedules.day_of_week`, en el MISMO orden/índice que la
 * convención documentada en `lib/datetime/lima.ts` (`getLimaWeekday`): índice 0 = domingo,
 * 1 = lunes, ..., 6 = sábado -- igual que `Date.getDay()`/`EXTRACT(DOW)` de Postgres. Confirmado
 * explícitamente para este proyecto, no es una suposición.
 */
export const DAY_OF_WEEK_LABELS: readonly string[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Mismo shape que ContentActionState (content/actions.ts) -- consistente en todo el proyecto
 * para Server Actions que devuelven error/fieldErrors/data. */
export type SchedulingActionState<T = never> = { error?: string; fieldErrors?: Record<string, string>; data?: T };

export interface ClassroomOption {
  id: number;
  name: string;
}

export interface SessionListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System); no relaja
  // el tipado de los accesos nombrados abajo -- mismo criterio que ClassroomListItem.
  [key: string]: unknown;
  id: number;
  classroomId: number;
  classroomName: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledTeacherId: string;
  scheduledTeacherName: string;
  actualTeacherId: string | null;
  actualTeacherName: string | null;
  /** No nulo => la clase ya se inició (start_session) -- usado por /teacher/clases para decidir
   * entre mostrar "Iniciar clase" o "Finalizar clase". */
  actualStart: string | null;
  status: SessionStatus;
  rescheduledFromSessionId: number | null;
}

export interface SessionTeacherChangeItem {
  id: number;
  changeType: SessionTeacherChangeType;
  previousTeacherName: string | null;
  newTeacherName: string;
  changedByName: string;
  changedAt: string;
  reason: string | null;
}

export interface SessionDetail extends SessionListItem {
  notes: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  /** Sesión hija si esta fue reprogramada (status='rescheduled') -- null en cualquier otro caso. */
  rescheduledToSessionId: number | null;
  teacherChanges: SessionTeacherChangeItem[];
}

export type TeacherCompatibilityStatus = "compatible" | "out_of_availability" | "conflict" | "no_availability";

export const TEACHER_COMPATIBILITY_LABEL: Record<TeacherCompatibilityStatus, string> = {
  compatible: "Disponible",
  out_of_availability: "No disponible (horario insuficiente)",
  conflict: "Conflicto de horario",
  no_availability: "No disponible (sin disponibilidad registrada)",
};

export const TEACHER_COMPATIBILITY_TONE: Record<TeacherCompatibilityStatus, "success" | "warning" | "danger" | "neutral"> = {
  compatible: "success",
  out_of_availability: "warning",
  conflict: "danger",
  no_availability: "neutral",
};

export interface TeacherCompatibilityItem {
  teacherId: string;
  firstName: string;
  lastName: string;
  status: TeacherCompatibilityStatus;
}

export interface ClassScheduleItem {
  id: number;
  classroomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}

export type GenerationOutcome = "create" | "duplicate" | "conflict";

export interface GeneratedSessionPreviewItem {
  classScheduleId: number;
  /** Fecha calendario en Lima, "YYYY-MM-DD" -- solo para mostrar, la autoridad real es scheduledStart. */
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledTeacherId: string;
  outcome: GenerationOutcome;
  conflictReason?: string;
}

export type SessionConflictReason = "classroom" | "teacher" | "both";

export interface SessionConflict {
  sessionId: number;
  reason: SessionConflictReason;
  scheduledStart: string;
  scheduledEnd: string;
  classroomName: string;
  teacherName: string;
}

/**
 * `minutesCharged === null` significa "todavía no se decidió" -- initialize_session_attendance
 * inserta la fila con `status='present'` por default, pero eso NO es una asistencia confirmada,
 * es solo el valor inicial de la columna. La UI debe mostrar "Pendiente de facturación" mientras
 * `minutesCharged` sea `null`, sin importar qué diga `status`, y recién mostrar el `status` real
 * una vez que `set_student_session_billing` lo fijó explícitamente.
 */
export interface AttendanceRosterItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que SessionListItem/ClassroomListItem.
  [key: string]: unknown;
  attendanceId: number;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  minutesCharged: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
}
