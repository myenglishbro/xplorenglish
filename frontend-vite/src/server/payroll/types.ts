import type { Database } from "@/types/database.types";
import type { TagTone } from "@/components/ui/core/Tag";

export type ClassRecordStatus = Database["public"]["Enums"]["class_record_status"];

/** Estado financiero derivado (nunca almacenado): REPROGRAMADA nunca genera deuda; PRESENT/ABSENT
 * es PENDIENTE hasta que teacher_payment_id se asigna, luego PAGADO -- para siempre, nunca vuelve
 * a cambiar (class_records_lock_paid, Slice A). */
export type ClassRecordFinancialStatus = "pending" | "paid" | "not_applicable";

export const FINANCIAL_STATUS_LABEL: Record<ClassRecordFinancialStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  not_applicable: "No aplica",
};

export const FINANCIAL_STATUS_TONE: Record<ClassRecordFinancialStatus, TagTone> = {
  pending: "warning",
  paid: "success",
  not_applicable: "neutral",
};

export function classRecordFinancialStatus(status: ClassRecordStatus, teacherPaymentId: number | null): ClassRecordFinancialStatus {
  if (status === "rescheduled") return "not_applicable";
  return teacherPaymentId ? "paid" : "pending";
}

/** Fila del listado principal Admin -> Pagos a profesores (admin_teacher_payment_summary). Los
 * totales pendientes se calculan exclusivamente desde class_records PRESENT/ABSENT con amount no
 * nulo y teacher_payment_id nulo -- nunca desde otra tabla. */
export interface TeacherPaymentSummaryItem {
  [key: string]: unknown;
  teacherId: string;
  teacherName: string;
  pendingClassCount: number;
  pendingMinutes: number;
  pendingAmount: number;
  lastClassAt: string | null;
}

/** Fila del estado de cuenta de un profesor (Admin -> Pagos a profesores -> detalle).
 * Índice requerido por DataTable<T extends Record<string, unknown>> (Design System). */
export interface TeacherPaymentStatementRow {
  [key: string]: unknown;
  id: number;
  occurredAt: string;
  status: ClassRecordStatus;
  minutes: number;
  notes: string | null;
  hourlyRateSnapshot: number | null;
  amount: number | null;
  teacherPaymentId: number | null;
  paidAt: string | null;
  classroomName: string;
  studentId: string | null;
  studentName: string;
  financialStatus: ClassRecordFinancialStatus;
}

export interface PayTeacherClassesResult {
  paymentId: number;
  teacherId: string;
  paidAt: string;
  totalMinutes: number;
  totalAmount: number;
  reference: string | null;
  classRecordIds: number[];
}

/** Fila del reporte financiero de Teacher -> Mis pagos (FIX 6, segunda etapa) -- un teacher_payment
 * REAL del docente autenticado, atribuido por paid_at (nunca class_records.occurred_at). minutes/
 * totalAmount son los valores OFICIALES del pago (teacher_payments), nunca recalculados sumando
 * class_records -- classCount es el único dato derivado. */
export interface MyTeacherPaymentItem {
  [key: string]: unknown;
  id: number;
  paidAt: string;
  classCount: number;
  minutes: number;
  totalAmount: number;
  reference: string | null;
}

/** Una clase incluida en un pago propio (detalle de MyTeacherPaymentItem). hourlyRateSnapshot/amount
 * son el valor histórico de ESA clase, nunca la tarifa actual del docente. */
export interface MyTeacherPaymentClassItem {
  [key: string]: unknown;
  id: number;
  occurredAt: string;
  studentName: string;
  minutes: number;
  hourlyRateSnapshot: number | null;
  amount: number | null;
}

/** Un punto del gráfico "Pagos recibidos por mes" de Teacher -> Mis pagos -- SUM(teacher_payments.
 * total_amount) agrupado por mes de paid_at, del docente autenticado. Meses sin pagos siguen
 * apareciendo con totalAmount=0 para mantener continuidad temporal. */
export interface MyTeacherPaymentMonthlyPoint {
  [key: string]: unknown;
  monthKey: string;
  monthLabel: string;
  totalAmount: number;
}

/** Opción del selector "Alumno" de Teacher -> Mis pagos (FIX 8, segunda etapa) -- derivada de
 * class_records.student_id históricos del docente (no solo classrooms actualmente activos), para
 * que un alumno con salón archivado pero pagos/clases históricos no desaparezca del filtro. */
export interface MyStudentOption {
  [key: string]: unknown;
  studentId: string;
  studentName: string;
}

/** Fila de "Pagos recibidos" de Teacher -> Mis pagos CON alumno seleccionado (FIX 8) --
 * deliberadamente distinta de MyTeacherPaymentItem: minutes/amount son la PORCIÓN atribuible a ese
 * alumno dentro del teacher_payment (SUM de sus propios class_records), NUNCA
 * teacher_payments.total_amount/total_minutes completos (que pueden incluir clases de otros
 * alumnos del mismo pago). classCount = clases del alumno en ESE pago, no el total del pago. */
export interface MyTeacherPaymentStudentItem {
  [key: string]: unknown;
  id: number;
  paidAt: string;
  classCount: number;
  minutes: number;
  amount: number;
  reference: string | null;
}
