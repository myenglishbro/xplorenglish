import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PayrollPeriodListItem, PayrollPeriodDetail, PayrollHourItem, PayrollReceiptSummary, PayrollPeriodStatus } from "./types";

type Client = SupabaseClient<Database>;

interface PeriodRow {
  id: number;
  teacher_id: string;
  period_start: string;
  period_end: string;
  total_minutes: number;
  total_amount: number;
  status: PayrollPeriodStatus;
  paid_at: string | null;
  teacher: { profile: { first_name: string; last_name: string } | null } | null;
}

const PERIOD_SELECT = `
  id, teacher_id, period_start, period_end, total_minutes, total_amount, status, paid_at,
  teacher:teacher_profiles!teacher_payment_periods_teacher_id_fkey(profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name))
`;

function teacherNameOf(row: PeriodRow): string {
  const p = row.teacher?.profile;
  return p ? `${p.first_name} ${p.last_name}` : "—";
}

/**
 * 2 round-trips fijos, sin importar cuántos periodos haya -- nunca una query por fila:
 * 1) teacher_payment_periods + nombre del docente, vía el mismo embed encadenado
 *    (teacher_profiles -> profiles) ya usado en server/dashboard/queries.ts;
 * 2) teacher_receipts de esos IDs en una sola llamada (.in), solo para armar el flag
 *    hasReceipt -- nunca una fila completa por periodo.
 */
export async function listPayrollPeriods(supabase: Client): Promise<PayrollPeriodListItem[]> {
  const { data: rows, error } = await supabase
    .from("teacher_payment_periods")
    .select(PERIOD_SELECT)
    .order("period_start", { ascending: false })
    .returns<PeriodRow[]>();

  if (error) throw error;
  if (rows.length === 0) return [];

  const periodIds = rows.map((r) => r.id);
  const { data: receipts, error: receiptsError } = await supabase
    .from("teacher_receipts")
    .select("teacher_payment_period_id")
    .in("teacher_payment_period_id", periodIds);

  if (receiptsError) throw receiptsError;
  const withReceipt = new Set(receipts.map((r) => r.teacher_payment_period_id));

  return rows.map((r) => ({
    id: r.id,
    teacherId: r.teacher_id,
    teacherName: teacherNameOf(r),
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalMinutes: r.total_minutes,
    totalAmount: r.total_amount,
    status: r.status,
    hasReceipt: withReceipt.has(r.id),
  }));
}

interface HourRow {
  id: number;
  session_id: number;
  billable_minutes: number;
  hourly_rate_snapshot: number;
  amount: number;
  session: { scheduled_start: string; classroom: { name: string } | null } | null;
}

interface ReceiptRow {
  id: number;
  file_path: string;
  uploaded_at: string;
}

/**
 * Específica para un solo id (detalle admin de un periodo) -- 3 queries en paralelo (periodo,
 * horas, recibo). No se combinan en una sola llamada porque teacher_receipts no tiene FK hacia
 * teacher_hours_log (son 2 tablas independientes, ambas relacionadas solo con el periodo) --
 * cada una ya viene acotada por teacher_payment_period_id, así que 3 queries puntuales son más
 * simples y igual de baratas que forzar un único select artificial.
 */
export async function getPayrollPeriodDetail(supabase: Client, periodId: number): Promise<PayrollPeriodDetail | null> {
  const [periodResult, hoursResult, receiptResult] = await Promise.all([
    supabase.from("teacher_payment_periods").select(PERIOD_SELECT).eq("id", periodId).maybeSingle().returns<PeriodRow | null>(),
    supabase
      .from("teacher_hours_log")
      .select("id, session_id, billable_minutes, hourly_rate_snapshot, amount, session:sessions(scheduled_start, classroom:classrooms(name))")
      .eq("teacher_payment_period_id", periodId)
      .returns<HourRow[]>(),
    supabase
      .from("teacher_receipts")
      .select("id, file_path, uploaded_at")
      .eq("teacher_payment_period_id", periodId)
      .maybeSingle()
      .returns<ReceiptRow | null>(),
  ]);

  if (periodResult.error) throw periodResult.error;
  if (hoursResult.error) throw hoursResult.error;
  if (receiptResult.error) throw receiptResult.error;

  const period = periodResult.data;
  if (!period) return null;

  const hours: PayrollHourItem[] = hoursResult.data
    .filter((h): h is HourRow & { session: NonNullable<HourRow["session"]> } => !!h.session)
    .map((h) => ({
      id: h.id,
      sessionId: h.session_id,
      classroomName: h.session.classroom?.name ?? "—",
      sessionDate: h.session.scheduled_start,
      billableMinutes: h.billable_minutes,
      hourlyRateSnapshot: h.hourly_rate_snapshot,
      amount: h.amount,
    }))
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

  const receiptRow = receiptResult.data;
  const receipt: PayrollReceiptSummary | null = receiptRow
    ? { id: receiptRow.id, filePath: receiptRow.file_path, uploadedAt: receiptRow.uploaded_at }
    : null;

  return {
    id: period.id,
    teacherId: period.teacher_id,
    teacherName: teacherNameOf(period),
    periodStart: period.period_start,
    periodEnd: period.period_end,
    totalMinutes: period.total_minutes,
    totalAmount: period.total_amount,
    status: period.status,
    paidAt: period.paid_at,
    hours,
    receipt,
  };
}
