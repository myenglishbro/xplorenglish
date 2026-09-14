import type { Database } from "@/types/database.types";

export type AlertKind =
  | "classroom_without_primary"
  | "session_overdue_unresolved"
  | "teacher_period_pending_receipt"
  | "teacher_period_awaiting_payment";

export type ActivityKind = "student_payment_completed" | "teacher_period_paid";

export type ClassesMode = "today" | "upcoming";

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
 * los otros 4 se muestran igual. "error" nunca se confunde con un 0 real.
 */
export type KpiValue<T = number> = { status: "ok"; value: T } | { status: "error" };

export interface DashboardKpis {
  activeStudents: KpiValue;
  activeTeachers: KpiValue;
  activeClassrooms: KpiValue;
  todaySessionsCount: KpiValue;
  pendingStudentPayments: KpiValue<{ count: number; totalAmount: number }>;
}

export interface DashboardSession {
  id: number;
  scheduledStart: string;
  scheduledEnd: string;
  classroomName: string;
  teacherName: string | null;
  status: Database["public"]["Enums"]["session_status"];
}

export interface ClassesToday {
  mode: ClassesMode;
  sessions: DashboardSession[];
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
  classes: SectionResult<ClassesToday>;
  alerts: SectionResult<DashboardAlert[]>;
  recentActivity: SectionResult<DashboardActivityItem[]>;
  recentStudents: SectionResult<RecentStudent[]>;
}
