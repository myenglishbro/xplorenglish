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
