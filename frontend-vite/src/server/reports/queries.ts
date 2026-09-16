import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getMonthRangeInLima, type LimaDateRange } from "@/lib/datetime/lima";
import { listTeacherDebtSummary } from "@/server/payroll/queries";
import type { FinancialReport, SalesDetailItem, TeacherCostDetailItem, ExpenseDetailItem, FinancialMonthlyTrendPoint } from "./types";

type Client = SupabaseClient<Database>;

/** Dinero en centavos enteros mientras se acumula -- mismo criterio aprobado en Slice 3, para que
 * sumas como S/10.10 + S/20.20 den exactamente S/30.30, nunca 30.299999999999997. */
function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

// ================================================================================================
// Ingresos cobrados -- source of truth: student_payments (status='completed', paid_at ∈ periodo)
// ================================================================================================

interface PaymentRow {
  id: number;
  amount: number;
  payment_method: string;
  paid_at: string | null;
  student: { first_name: string; last_name: string } | null;
  hours_packages: { package_label: string }[];
}

const SALES_SELECT = `
  id, amount, payment_method, paid_at,
  student:profiles!student_payments_student_id_fkey(first_name, last_name),
  hours_packages(package_label)
`;

/**
 * Filtra por `paid_at` (columna timestamptz real), nunca `created_at` -- un pago registrado hoy
 * pero pagado el mes pasado (si el flujo alguna vez lo permitiera) pertenecería al mes pasado.
 * `status='completed'` es la única condición de "cobrado": pending/failed/refunded nunca cuentan
 * como ingreso, sin importar su `paid_at`. El concepto (`hours_packages.package_label`) es solo
 * texto de presentación -- el dinero entra una única vez, desde `student_payments.amount`, nunca
 * se vuelve a sumar `hours_packages.price_paid`.
 */
async function listSales(supabase: Client, range: LimaDateRange): Promise<{ items: SalesDetailItem[]; totalCents: number }> {
  const { data, error } = await supabase
    .from("student_payments")
    .select(SALES_SELECT)
    .eq("status", "completed")
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString())
    .order("paid_at", { ascending: false })
    .returns<PaymentRow[]>();

  if (error) throw error;

  let totalCents = 0;
  const items: SalesDetailItem[] = data
    .filter((row): row is PaymentRow & { paid_at: string } => row.paid_at !== null)
    .map((row) => {
      totalCents += toCents(row.amount);
      return {
        id: row.id,
        paidAt: row.paid_at,
        studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "Estudiante",
        concept: row.hours_packages[0]?.package_label ?? "Pago",
        paymentMethod: row.payment_method,
        amount: row.amount,
      };
    });

  return { items, totalCents };
}

// ================================================================================================
// Costo docente generado -- source of truth: teacher_hours_log.amount, atribuido por
// sessions.actual_end (NUNCA teacher_hours_log.created_at).
// ================================================================================================

interface HoursLogRow {
  teacher_id: string;
  billable_minutes: number;
  amount: number;
  teacher: { profile: { first_name: string; last_name: string } | null } | null;
  session: { actual_start: string | null; actual_end: string | null } | null;
}

const TEACHER_COST_SELECT = `
  teacher_id, billable_minutes, amount,
  teacher:teacher_profiles!teacher_hours_log_teacher_id_fkey(profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name)),
  session:sessions(actual_start, actual_end)
`;

/**
 * Sin filtro a nivel de query (PostgREST no permite filtrar de forma confiable por una columna de
 * un embed simple sin !inner, patrón no usado hasta ahora en este proyecto) -- se trae todo
 * teacher_hours_log (mismo volumen que Slice 3, decenas de filas) y se filtra/agrega en JS
 * comparando `sessions.actual_end` (fallback actual_start) contra el rango. Esto es exactamente lo
 * mismo que ya hace listTeacherDebtSummary (Slice 3), solo que ahí es global y acá se acota al
 * periodo -- no es una segunda fórmula de "pendiente", es una vista distinta (costo generado EN el
 * periodo) que Slice 3 no necesitaba.
 */
async function listTeacherCostForPeriod(
  supabase: Client,
  range: LimaDateRange
): Promise<{ items: TeacherCostDetailItem[]; totalCents: number }> {
  const { data, error } = await supabase.from("teacher_hours_log").select(TEACHER_COST_SELECT).returns<HoursLogRow[]>();
  if (error) throw error;

  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  let totalCents = 0;
  const byTeacher = new Map<string, { name: string; minutes: number; cents: number }>();

  for (const row of data) {
    const sessionDateStr = row.session?.actual_end ?? row.session?.actual_start;
    if (!sessionDateStr) continue; // sin sesión asociada -- no debería ocurrir, se omite defensivamente
    const t = new Date(sessionDateStr).getTime();
    if (t < startMs || t >= endMs) continue; // fuera del periodo pedido

    const cents = toCents(row.amount);
    totalCents += cents;

    const entry = byTeacher.get(row.teacher_id) ?? {
      name: row.teacher?.profile ? `${row.teacher.profile.first_name} ${row.teacher.profile.last_name}` : "—",
      minutes: 0,
      cents: 0,
    };
    entry.minutes += row.billable_minutes;
    entry.cents += cents;
    byTeacher.set(row.teacher_id, entry);
  }

  const items: TeacherCostDetailItem[] = Array.from(byTeacher.entries())
    .map(([teacherId, v]) => ({ teacherId, teacherName: v.name, minutes: v.minutes, amount: v.cents / 100 }))
    .sort((a, b) => b.amount - a.amount);

  return { items, totalCents };
}

// ================================================================================================
// Profesores pagados -- source of truth: teacher_payment_periods (status='paid', paid_at ∈
// periodo). NUNCA teacher_hours_log para decidir el mes del pago: una obligación generada en
// septiembre puede pagarse en octubre, y debe contar como salida de caja de octubre.
// ================================================================================================

async function sumPaidTeachers(supabase: Client, range: LimaDateRange): Promise<number> {
  const { data, error } = await supabase
    .from("teacher_payment_periods")
    .select("total_amount, paid_at")
    .eq("status", "paid")
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString());

  if (error) throw error;
  return data.reduce((cents, row) => cents + toCents(row.total_amount), 0);
}

// ================================================================================================
// Otros gastos -- source of truth: business_expenses (expense_date ∈ periodo, NUNCA created_at).
// `expense_date` es `date` puro sin zona -- se filtra con las strings YYYY-MM-DD del rango
// (ambas inclusive), nunca con los instantes timestamptz (comparar un `date` contra un instante
// UTC desplaza el corte 5 horas respecto a la medianoche de Lima).
// ================================================================================================

interface ExpenseRow {
  id: number;
  expense_date: string;
  category: Database["public"]["Enums"]["expense_category"];
  description: string;
  amount: number;
  payment_method: string;
}

async function listExpensesForPeriod(supabase: Client, range: LimaDateRange): Promise<{ items: ExpenseDetailItem[]; totalCents: number }> {
  const { data, error } = await supabase
    .from("business_expenses")
    .select("id, expense_date, category, description, amount, payment_method")
    .gte("expense_date", range.startDate)
    .lte("expense_date", range.endDate)
    .order("expense_date", { ascending: false })
    .returns<ExpenseRow[]>();

  if (error) throw error;

  let totalCents = 0;
  const items: ExpenseDetailItem[] = data.map((row) => {
    totalCents += toCents(row.amount);
    return {
      id: row.id,
      expenseDate: row.expense_date,
      category: row.category,
      description: row.description,
      amount: row.amount,
      paymentMethod: row.payment_method,
    };
  });

  return { items, totalCents };
}

// ================================================================================================
// Reporte financiero completo
// ================================================================================================

/**
 * Capa de lectura/cálculo para Admin -> Reportes. Todo RLS-safe desde el browser (admin ve todas
 * las filas de las 4 tablas involucradas vía las policies ya existentes -- student_payments,
 * teacher_hours_log, teacher_payment_periods, business_expenses), sin service_role ni RPC nueva:
 * las 4 fórmulas son SUM/GROUP BY directos sobre columnas ya calculadas, no lógica de negocio.
 *
 * `pendingTeachers` reutiliza tal cual listTeacherDebtSummary (Slice 3) -- nunca una segunda
 * fórmula de deuda. Es, a propósito, independiente de `range`: representa la deuda acumulada a la
 * fecha, no "lo generado en el periodo".
 */
export async function getFinancialReport(supabase: Client, range: LimaDateRange): Promise<FinancialReport> {
  const [salesResult, teacherCostResult, paidTeachersCents, expensesResult, debtSummary] = await Promise.all([
    listSales(supabase, range),
    listTeacherCostForPeriod(supabase, range),
    sumPaidTeachers(supabase, range),
    listExpensesForPeriod(supabase, range),
    listTeacherDebtSummary(supabase),
  ]);

  const collectedIncomeCents = salesResult.totalCents;
  const generatedTeacherCostCents = teacherCostResult.totalCents;
  const otherExpensesCents = expensesResult.totalCents;
  const pendingTeachersCents = debtSummary.reduce((cents, item) => cents + toCents(item.pendingAmount), 0);

  const operatingResultCents = collectedIncomeCents - generatedTeacherCostCents - otherExpensesCents;
  const cashFlowCents = collectedIncomeCents - paidTeachersCents - otherExpensesCents;

  return {
    period: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      startDate: range.startDate,
      endDate: range.endDate,
    },
    kpis: {
      collectedIncome: collectedIncomeCents / 100,
      generatedTeacherCost: generatedTeacherCostCents / 100,
      paidTeachers: paidTeachersCents / 100,
      pendingTeachers: pendingTeachersCents / 100,
      otherExpenses: otherExpensesCents / 100,
      operatingResult: operatingResultCents / 100,
      cashFlow: cashFlowCents / 100,
    },
    sales: salesResult.items,
    teachers: teacherCostResult.items,
    expenses: expensesResult.items,
  };
}

// ================================================================================================
// Tendencia mensual (gráfico Ingresos vs. gastos) -- 3 round-trips totales, sin importar cuántos
// meses se pidan: NUNCA se llama getFinancialReport una vez por mes (repetiría, entre otras cosas,
// listTeacherDebtSummary -- que ni siquiera hace falta acá -- monthsBack veces). Deliberadamente
// SIN pendingTeachers (ver types.ts): es un saldo acumulado, no un gasto del mes.
// ================================================================================================

function monthKeyOf(dateStr: string): string {
  return getMonthRangeInLima(new Date(dateStr)).startDate.slice(0, 7);
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

function monthLabelEs(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y as number, (m as number) - 1, 1));
  return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

interface TrendPaymentRow {
  amount: number;
  paid_at: string | null;
}

interface TrendHoursLogRow {
  amount: number;
  session: { actual_start: string | null; actual_end: string | null } | null;
}

interface TrendExpenseRow {
  amount: number;
  expense_date: string;
}

/**
 * Últimos `monthsBack` meses (incluido el mes de `anchorDate`), oldest -> newest. Mismas 3 fuentes
 * de verdad que getFinancialReport (student_payments/paid_at, teacher_hours_log/sessions.actual_end,
 * business_expenses/expense_date), agregadas en JS por mes en centavos enteros -- sin RPC nueva,
 * sin recalcular ninguna fórmula distinta a la ya aprobada.
 */
export async function getFinancialMonthlyTrend(
  supabase: Client,
  monthsBack = 6,
  anchorDate: Date = new Date()
): Promise<FinancialMonthlyTrendPoint[]> {
  const currentMonthKey = getMonthRangeInLima(anchorDate).startDate.slice(0, 7);

  const buckets = Array.from({ length: monthsBack }, (_, i) => {
    const key = shiftMonthKey(currentMonthKey, -(monthsBack - 1 - i));
    const range = getMonthRangeInLima(new Date(`${key}-15T12:00:00Z`));
    return { key, label: monthLabelEs(key), range, incomeCents: 0, teacherCostCents: 0, expenseCents: 0 };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  const windowStart = buckets[0]!.range.start;
  const windowEnd = buckets[buckets.length - 1]!.range.end;
  const windowStartDate = buckets[0]!.range.startDate;
  const windowEndDate = buckets[buckets.length - 1]!.range.endDate;

  const [paymentsRes, hoursLogRes, expensesRes] = await Promise.all([
    supabase
      .from("student_payments")
      .select("amount, paid_at")
      .eq("status", "completed")
      .gte("paid_at", windowStart.toISOString())
      .lt("paid_at", windowEnd.toISOString())
      .returns<TrendPaymentRow[]>(),
    supabase.from("teacher_hours_log").select("amount, session:sessions(actual_start, actual_end)").returns<TrendHoursLogRow[]>(),
    supabase
      .from("business_expenses")
      .select("amount, expense_date")
      .gte("expense_date", windowStartDate)
      .lte("expense_date", windowEndDate)
      .returns<TrendExpenseRow[]>(),
  ]);

  if (paymentsRes.error) throw paymentsRes.error;
  if (hoursLogRes.error) throw hoursLogRes.error;
  if (expensesRes.error) throw expensesRes.error;

  for (const row of paymentsRes.data) {
    if (!row.paid_at) continue;
    const bucket = byKey.get(monthKeyOf(row.paid_at));
    if (bucket) bucket.incomeCents += toCents(row.amount);
  }

  for (const row of hoursLogRes.data) {
    const sessionDate = row.session?.actual_end ?? row.session?.actual_start;
    if (!sessionDate) continue;
    const bucket = byKey.get(monthKeyOf(sessionDate));
    if (bucket) bucket.teacherCostCents += toCents(row.amount);
  }

  for (const row of expensesRes.data) {
    const bucket = byKey.get(row.expense_date.slice(0, 7));
    if (bucket) bucket.expenseCents += toCents(row.amount);
  }

  return buckets.map((b) => ({
    monthKey: b.key,
    monthLabel: b.label,
    collectedIncome: b.incomeCents / 100,
    generatedTeacherCost: b.teacherCostCents / 100,
    otherExpenses: b.expenseCents / 100,
  }));
}
