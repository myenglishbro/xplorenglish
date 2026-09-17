import type { Database } from "@/types/database.types";

export type AlertKind = "classroom_without_teacher" | "teacher_classes_pending_payment";

export type ActivityKind = "student_payment_completed" | "teacher_period_paid";

/**
 * Resultado de una sección del dashboard, aislado del resto: si esta consulta falla,
 * las demás secciones se siguen renderizando. "error" es un estado explícito, nunca se
 * degrada silenciosamente a un 0 o a un arreglo vacío.
 */
export type SectionResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

/**
 * Valor individual de KPI, aislado del resto de KPIs: si el conteo de un KPI falla,
 * los otros se muestran igual. "error" nunca se confunde con un 0 real.
 */
export type KpiValue<T = number> = { status: "ok"; value: T } | { status: "error" };

/** Ajuste del dashboard (post-Slice H): se retiran "Clases de hoy" (class_schedules es
 * planificación referencial, no algo "de hoy" realmente ocurrido) y "Pagos estudiantes pendientes"
 * (no existe venta a crédito en el modelo actual -- register_class/correct_class impiden saldo
 * negativo). "Sin saldo" se calcula en la página desde useStudentBalanceAlerts (Slice G), NUNCA una
 * segunda fuente de saldo -- por eso no aparece acá como KPI propio de este módulo. */
export interface DashboardKpis {
  activeStudents: KpiValue;
  activeTeachers: KpiValue;
  activeClassrooms: KpiValue;
}

export type AcademicLevel = Database["public"]["Enums"]["academic_level"];

/**
 * Un bloque de la Agenda semanal (ajuste post-Slice H) -- PROYECCIÓN visual de un class_schedule
 * (planificación referencial recurrente), nunca un class_record (la realidad de lo registrado).
 * dayOfWeek/startTime/endTime son los valores crudos de class_schedules: la UI decide a qué fecha
 * real corresponden según la semana seleccionada, este tipo no fija una fecha.
 */
export interface WeeklyAgendaBlock {
  id: number;
  classroomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomName: string;
  studentName: string | null;
  level: AcademicLevel | null;
  programName: string | null;
  /** classroom_teachers activos de este salón, por nombre -- 0 = "Sin profesor", 1 = su nombre,
   * 2+ = "N profesores" (ver WeeklyAgenda.tsx). Nunca un solo profesor elegido arbitrariamente. */
  teacherNames: string[];
}

export interface DashboardAlert {
  kind: AlertKind;
  label: string;
  detail: string;
  href: string;
}

export interface DashboardActivityItem {
  kind: ActivityKind;
  id: number;
  personName: string;
  amount: number;
  occurredAt: string;
}

export interface RecentStudent {
  id: string;
  fullName: string;
  createdAt: string;
}

export interface DashboardData {
  kpis: SectionResult<DashboardKpis>;
  agenda: SectionResult<WeeklyAgendaBlock[]>;
  alerts: SectionResult<DashboardAlert[]>;
  recentActivity: SectionResult<DashboardActivityItem[]>;
  recentStudents: SectionResult<RecentStudent[]>;
}
