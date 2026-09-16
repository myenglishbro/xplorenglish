import type { Database } from "@/types/database.types";
import type { TagTone } from "@/components/ui/core/Tag";

export type PayrollPeriodStatus = Database["public"]["Enums"]["teacher_payment_period_status"];

export const PAYROLL_STATUS_LABEL: Record<PayrollPeriodStatus, string> = {
  pending: "Pendiente",
  pending_receipt: "Pendiente de recibo",
  receipt_uploaded: "Recibo subido",
  approved: "Aprobado",
  paid: "Pagado",
};

/** Única fuente de verdad para el color del estado -- reutilizada por PayrollPeriodsTable y por
 * el detalle, para que ambas pantallas nunca puedan divergir en qué tono le corresponde a cada
 * status. */
export const PAYROLL_STATUS_TONE: Record<PayrollPeriodStatus, TagTone> = {
  pending: "neutral",
  pending_receipt: "neutral",
  receipt_uploaded: "warning",
  approved: "brand",
  paid: "success",
};

export interface PayrollPeriodListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que el resto de *ListItem del proyecto.
  [key: string]: unknown;
  id: number;
  teacherId: string;
  teacherName: string;
  /** date puro "YYYY-MM-DD" (columna `date`, sin hora/zona) -- nunca pasar por Date()/timeZone,
   * formatear con split simple. */
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  totalAmount: number;
  status: PayrollPeriodStatus;
  hasReceipt: boolean;
}

export interface PayrollHourItem {
  id: number;
  sessionId: number;
  classroomName: string;
  /** scheduled_start real (timestamptz) de la sesión -- este sí es un instante real, a
   * diferencia de period_start/period_end. */
  sessionDate: string;
  billableMinutes: number;
  hourlyRateSnapshot: number;
  amount: number;
}

export interface PayrollReceiptSummary {
  id: number;
  filePath: string;
  uploadedAt: string;
}

export interface PayrollPeriodDetail {
  id: number;
  teacherId: string;
  teacherName: string;
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  totalAmount: number;
  status: PayrollPeriodStatus;
  paidAt: string | null;
  hours: PayrollHourItem[];
  receipt: PayrollReceiptSummary | null;
}

export interface TeacherDebtSummaryItem {
  [key: string]: unknown;
  teacherId: string;
  teacherName: string;
  /** SUM(teacher_hours_log.amount) del docente -- todo lo generado históricamente, sin importar
   * si ya se agrupó en un periodo o se pagó. */
  generatedAmount: number;
  /** SUM(teacher_hours_log.amount) cuyo teacher_payment_periods.status = 'paid' -- únicamente
   * 'paid' cuenta como pagado (pending/pending_receipt/receipt_uploaded/approved siguen siendo
   * deuda). */
  paidAmount: number;
  /** generatedAmount - paidAmount, calculado en centavos enteros para que la igualdad sea exacta. */
  pendingAmount: number;
  /** sessions.actual_end (fallback actual_start) de la sesión más reciente que generó costo para
   * este docente -- null si nunca dictó ninguna. Nunca teacher_hours_log.created_at. */
  lastClassAt: string | null;
}
