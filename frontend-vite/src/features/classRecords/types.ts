import type { Database } from "@/types/database.types";

export type ClassRecordStatus = Database["public"]["Enums"]["class_record_status"];

export interface RegisterClassInput {
  classroomId: number;
  occurredAt: string; // ISO timestamptz
  status: ClassRecordStatus;
  minutes: number;
  notes: string | null;
  idempotencyKey: string;
}

export interface CorrectClassInput {
  classRecordId: number;
  status: ClassRecordStatus;
  minutes: number;
  notes: string | null;
  /** ISO timestamptz -- opcional, solo se envía si el profesor cambió fecha/hora (AJUSTE 2).
   * Ignorado por el RPC si la clase ya está pagada (occurred_at sigue inmutable). */
  occurredAt?: string;
}

/** Fila de historial de un salón (Slice F) -- el nombre del profesor viene de class_records.teacher_id,
 * NUNCA del profesor actualmente habilitado en classroom_teachers (que puede haber cambiado).
 * Índice requerido por DataTable<T extends Record<string, unknown>> (Design System). */
export interface ClassRecordHistoryItem {
  [key: string]: unknown;
  id: number;
  occurredAt: string;
  status: ClassRecordStatus;
  minutes: number;
  notes: string | null;
  teacherId: string;
  teacherName: string;
  teacherPaymentId: number | null;
  hourlyRateSnapshot: number | null;
  amount: number | null;
}

export interface RegisterClassResult {
  id: number;
  classroomId: number;
  studentId: string;
  teacherId: string;
  occurredAt: string;
  status: ClassRecordStatus;
  minutes: number;
  notes: string | null;
  hourlyRateSnapshot: number | null;
  amount: number | null;
  teacherPaymentId: number | null;
  studentBalance: number;
}
