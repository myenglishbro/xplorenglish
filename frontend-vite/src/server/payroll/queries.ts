import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  PayrollPeriodListItem,
  PayrollPeriodDetail,
  PayrollHourItem,
  PayrollReceiptSummary,
  PayrollPeriodStatus,
  TeacherDebtSummaryItem,
} from "./types";

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

interface DebtHourRow {
  teacher_id: string;
  amount: number;
  // Embed nullable (teacher_payment_period_id puede ser null) -- null significa "todavía sin
  // agrupar en ningún periodo", que para efectos de deuda es exactamente lo mismo que un periodo
  // pending/approved/etc: no está pagado.
  teacher_payment_period: { status: PayrollPeriodStatus } | null;
  teacher: { profile: { first_name: string; last_name: string } | null } | null;
  // sessions.actual_end es la fecha económica real de la clase (ver decisión de arquitectura
  // financiera) -- actual_start queda solo como fallback técnico, nunca created_at del log.
  session: { actual_start: string | null; actual_end: string | null } | null;
}

const DEBT_SELECT = `
  teacher_id, amount,
  teacher_payment_period:teacher_payment_periods(status),
  teacher:teacher_profiles!teacher_hours_log_teacher_id_fkey(profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name)),
  session:sessions(actual_start, actual_end)
`;

/** Dinero en centavos enteros mientras se acumula -- evita que sumar muchas filas numeric(10,2)
 * como float introduzca un error de redondeo que rompa la igualdad exacta pendiente = generado -
 * pagado (ver Slice 3, punto 12: la prueba financiera exige que esa igualdad se cumpla al centavo). */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Source of truth: teacher_hours_log.amount (importe ya calculado y congelado por complete_session
 * -- nunca se recalcula horas × teacher_profiles.hourly_rate actual). RLS
 * (teacher_hours_log_select_own, 0008) ya permite a un admin ver todas las filas -- esta query es
 * de un solo round-trip, sin service_role ni RPC nueva.
 *
 * Se incluye a TODOS los docentes que alguna vez generaron una fila en teacher_hours_log, sin
 * filtrar por teacher_profiles.status: un docente inactivo con saldo pendiente debe seguir
 * apareciendo (Slice 3, punto 6). Los suplentes ya están resueltos correctamente por el modelo --
 * teacher_hours_log.teacher_id es siempre sessions.actual_teacher_id (quien realmente dictó),
 * nunca el titular del salón; esta query solo agrupa por esa columna, sin volver a decidir nada.
 */
export async function listTeacherDebtSummary(supabase: Client): Promise<TeacherDebtSummaryItem[]> {
  const { data, error } = await supabase.from("teacher_hours_log").select(DEBT_SELECT).returns<DebtHourRow[]>();
  if (error) throw error;

  const byTeacher = new Map<string, { name: string; generatedCents: number; paidCents: number; lastClassAt: string | null }>();

  for (const row of data) {
    const entry = byTeacher.get(row.teacher_id) ?? {
      name: row.teacher?.profile ? `${row.teacher.profile.first_name} ${row.teacher.profile.last_name}` : "—",
      generatedCents: 0,
      paidCents: 0,
      lastClassAt: null,
    };

    const cents = toCents(Number(row.amount));
    entry.generatedCents += cents;
    // Únicamente 'paid' cuenta como pagado -- pending/pending_receipt/receipt_uploaded/approved
    // (incluido null, sin periodo todavía) siguen siendo deuda pendiente.
    if (row.teacher_payment_period?.status === "paid") entry.paidCents += cents;

    const sessionDate = row.session?.actual_end ?? row.session?.actual_start ?? null;
    if (sessionDate && (!entry.lastClassAt || sessionDate > entry.lastClassAt)) entry.lastClassAt = sessionDate;

    byTeacher.set(row.teacher_id, entry);
  }

  return Array.from(byTeacher.entries())
    .map(([teacherId, v]) => ({
      teacherId,
      teacherName: v.name,
      generatedAmount: v.generatedCents / 100,
      paidAmount: v.paidCents / 100,
      pendingAmount: (v.generatedCents - v.paidCents) / 100,
      lastClassAt: v.lastClassAt,
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount || a.teacherName.localeCompare(b.teacherName));
}
