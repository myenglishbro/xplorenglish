import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  classRecordFinancialStatus,
  type PayTeacherClassesResult,
  type TeacherPaymentStatementRow,
  type TeacherPaymentSummaryItem,
} from "./types";

type Client = SupabaseClient<Database>;

/**
 * Un solo round-trip (admin_teacher_payment_summary, Slice E) -- los totales pendientes se
 * calculan enteramente en la DB desde class_records (PRESENT/ABSENT, amount no nulo,
 * teacher_payment_id nulo), nunca aquí. Incluye a todo profesor activo aunque su deuda sea 0.
 */
export async function getTeacherPaymentSummaries(supabase: Client): Promise<TeacherPaymentSummaryItem[]> {
  const { data, error } = await supabase.rpc("admin_teacher_payment_summary");
  if (error) throw error;

  return data.map((row) => ({
    teacherId: row.teacher_id,
    teacherName: `${row.first_name} ${row.last_name}`,
    pendingClassCount: row.pending_class_count,
    pendingMinutes: row.pending_minutes,
    pendingAmount: row.pending_amount,
    lastClassAt: row.last_class_at,
  }));
}

export async function getTeacherName(supabase: Client, teacherId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("first_name, last_name").eq("id", teacherId).single();
  if (error) throw error;
  return `${data.first_name} ${data.last_name}`;
}

interface StatementRawRow {
  id: number;
  occurred_at: string;
  status: Database["public"]["Enums"]["class_record_status"];
  minutes: number;
  notes: string | null;
  hourly_rate_snapshot: number | null;
  amount: number | null;
  teacher_payment_id: number | null;
  classroom: { name: string } | null;
  student: { first_name: string; last_name: string } | null;
  payment: { paid_at: string } | null;
}

/**
 * Estado de cuenta cronológico de un profesor (más reciente arriba) -- un solo round-trip vía
 * embeds de PostgREST (classroom, alumno, pago si existe). RLS admin-only ya cubierto por
 * class_records_admin_write/class_records_select (Slice A).
 */
export async function getTeacherPaymentStatement(supabase: Client, teacherId: string): Promise<TeacherPaymentStatementRow[]> {
  const { data, error } = await supabase
    .from("class_records")
    .select(
      `
      id, occurred_at, status, minutes, notes, hourly_rate_snapshot, amount, teacher_payment_id,
      classroom:classrooms(name),
      student:profiles!class_records_student_id_fkey(first_name, last_name),
      payment:teacher_payments(paid_at)
    `,
    )
    .eq("teacher_id", teacherId)
    .order("occurred_at", { ascending: false })
    .returns<StatementRawRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    status: row.status,
    minutes: row.minutes,
    notes: row.notes,
    hourlyRateSnapshot: row.hourly_rate_snapshot,
    amount: row.amount,
    teacherPaymentId: row.teacher_payment_id,
    paidAt: row.payment?.paid_at ?? null,
    classroomName: row.classroom?.name ?? "—",
    studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "—",
    financialStatus: classRecordFinancialStatus(row.status, row.teacher_payment_id),
  }));
}

const PAY_RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para administradores.",
  INVALID_INPUT: "Faltan datos para completar el pago.",
  EMPTY_SELECTION: "Selecciona al menos una clase.",
  DUPLICATE_IDS: "La selección contiene clases duplicadas.",
  CLASS_RECORD_NOT_FOUND: "Alguna de las clases seleccionadas ya no existe.",
  INVALID_SELECTION: "Alguna clase ya fue pagada o dejó de ser válida. Actualiza la página e inténtalo de nuevo.",
};

function parsePayError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(PAY_RPC_ERROR_MESSAGES[code] ?? "No pudimos procesar el pago. Inténtalo de nuevo en unos minutos.");
}

/**
 * Único punto de escritura de un pago real (Slice E). El backend recalcula/valida todo -- este
 * cliente nunca envía minutos ni montos, solo los ids seleccionados y el profesor.
 */
export async function payTeacherClasses(
  supabase: Client,
  teacherId: string,
  classRecordIds: number[],
  reference: string | null,
): Promise<PayTeacherClassesResult> {
  const { data, error } = await supabase
    .rpc("pay_teacher_classes", {
      p_teacher_id: teacherId,
      p_class_record_ids: classRecordIds,
      p_reference: reference ?? undefined,
    })
    .single();

  if (error) throw parsePayError(error);

  return {
    paymentId: data.payment_id,
    teacherId: data.teacher_id,
    paidAt: data.paid_at,
    totalMinutes: data.total_minutes,
    totalAmount: data.total_amount,
    reference: data.reference,
    classRecordIds: data.class_record_ids,
  };
}
