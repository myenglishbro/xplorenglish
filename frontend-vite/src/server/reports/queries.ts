import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getMonthRangeInLima, type LimaDateRange } from "@/lib/datetime/lima";
import type { FinancialReport, SalesDetailItem, TeacherCostDetailItem, ExpenseDetailItem, FinancialMonthlyTrendPoint } from "./types";

type Client = SupabaseClient<Database>;

/** Dinero en centavos enteros mientras se acumula -- mismo criterio aprobado en Slice 3, para que
 * sumas como S/10.10 + S/20.20 den exactamente S/30.30, nunca 30.299999999999997. */
function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** class_records.teacher_id / teacher_payments.teacher_id son directamente el id de profiles
 * (teacher_profiles.profile_id es su PK y coincide con profiles.id, ver server/dashboard/queries.ts)
 * -- un solo batch fetch, nunca una query por profesor. Nombre histórico: se resuelve desde
 * profiles, NUNCA desde classroom_teachers (un profesor retirado de un salón sigue apareciendo
 * correctamente en su historial financiero). */
async function fetchTeacherNames(supabase: Client, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
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
// Costo docente GENERADO en el periodo -- source of truth: class_records (status IN
// ('present','absent') AND amount IS NOT NULL), atribuido por occurred_at (NUNCA created_at). Se
// cuenta aunque todavía no se le haya pagado al profesor -- eso es, a propósito, una obligación
// económica distinta de la salida de caja real (ver sumPaidTeachers/sumPendingTeacherDebt).
// ================================================================================================

interface ClassRecordCostRow {
  teacher_id: string;
  minutes: number;
  amount: number | null;
}

async function listTeacherCostForPeriod(
  supabase: Client,
  range: LimaDateRange
): Promise<{ items: TeacherCostDetailItem[]; totalCents: number }> {
  const { data, error } = await supabase
    .from("class_records")
    .select("teacher_id, minutes, amount")
    .in("status", ["present", "absent"])
    .not("amount", "is", null)
    .gte("occurred_at", range.start.toISOString())
    .lt("occurred_at", range.end.toISOString())
    .returns<ClassRecordCostRow[]>();

  if (error) throw error;

  let totalCents = 0;
  const byTeacher = new Map<string, { minutes: number; cents: number }>();

  for (const row of data) {
    const cents = toCents(row.amount ?? 0);
    totalCents += cents;

    const entry = byTeacher.get(row.teacher_id) ?? { minutes: 0, cents: 0 };
    entry.minutes += row.minutes;
    entry.cents += cents;
    byTeacher.set(row.teacher_id, entry);
  }

  const names = await fetchTeacherNames(supabase, [...byTeacher.keys()]);
  const items: TeacherCostDetailItem[] = Array.from(byTeacher.entries())
    .map(([teacherId, v]) => ({ teacherId, teacherName: names.get(teacherId) ?? "—", minutes: v.minutes, amount: v.cents / 100 }))
    .sort((a, b) => b.amount - a.amount);

  return { items, totalCents };
}

// ================================================================================================
// Pago real a docentes (salida de caja) -- source of truth: teacher_payments (SUM(total_amount),
// paid_at ∈ periodo). NUNCA class_records.occurred_at para decidir el mes del pago: una obligación
// generada en septiembre puede pagarse en octubre, y debe contar como salida de caja de octubre.
// ================================================================================================

async function sumPaidTeachers(supabase: Client, range: LimaDateRange): Promise<number> {
  const { data, error } = await supabase
    .from("teacher_payments")
    .select("total_amount, paid_at")
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString());

  if (error) throw error;
  return data.reduce((cents, row) => cents + toCents(row.total_amount), 0);
}

// ================================================================================================
// Deuda docente ACTUAL (stock, no depende del periodo seleccionado) -- source of truth:
// class_records (status IN ('present','absent') AND amount IS NOT NULL AND teacher_payment_id IS
// NULL), SUM(amount). Representa obligaciones YA generadas que todavía no se le pagaron al
// profesor -- se calcula siempre a la fecha actual, nunca acotado a `range` (mezclar stock actual
// con flujo del periodo sería incorrecto).
// ================================================================================================

async function sumPendingTeacherDebt(supabase: Client): Promise<number> {
  const { data, error } = await supabase
    .from("class_records")
    .select("amount")
    .in("status", ["present", "absent"])
    .not("amount", "is", null)
    .is("teacher_payment_id", null);

  if (error) throw error;
  return data.reduce((cents, row) => cents + toCents(row.amount ?? 0), 0);
}

// ================================================================================================
// Otros gastos -- source of truth: business_expenses (expense_date ∈ periodo, NUNCA created_at).
// `expense_date` es `date` puro sin zona -- se filtra con las strings YYYY-MM-DD del rango
// (ambas inclusive), nunca con los instantes timestamptz (comparar un `date` contra un instante
// UTC desplaza el corte 5 horas respecto a la medianoche de Lima). teacher_payments NUNCA se cuenta
// acá -- es una salida de caja propia (ver sumPaidTeachers), no un "otro gasto" de negocio.
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
 * Capa de lectura/cálculo para Admin -> Reportes (Slice H). Todo RLS-safe desde el browser (admin
 * ve todas las filas de las 4 tablas involucradas vía las policies ya existentes -- student_payments,
 * class_records, teacher_payments, business_expenses), sin service_role ni RPC nueva: las fórmulas
 * son SUM/GROUP BY directos sobre columnas ya calculadas (amount snapshot de class_records, NUNCA
 * recalculado desde minutes/hourly_rate), no lógica de negocio nueva.
 *
 * Resultado operativo = income - generatedTeacherCost - otherExpenses (obligación generada, se
 * haya pagado o no). Flujo de caja = income - paidTeachers - otherExpenses (salida de caja real).
 * Ambos pueden diferir legítimamente -- eso es exactamente lo esperado, nunca se concilian entre sí.
 * `pendingTeachers` es deuda ACTUAL (stock), a propósito independiente de `range`.
 */
export async function getFinancialReport(supabase: Client, range: LimaDateRange): Promise<FinancialReport> {
  const [salesResult, teacherCostResult, paidTeachersCents, expensesResult, pendingTeachersCents] = await Promise.all([
    listSales(supabase, range),
    listTeacherCostForPeriod(supabase, range),
    sumPaidTeachers(supabase, range),
    listExpensesForPeriod(supabase, range),
    sumPendingTeacherDebt(supabase),
  ]);

  const collectedIncomeCents = salesResult.totalCents;
  const generatedTeacherCostCents = teacherCostResult.totalCents;
  const otherExpensesCents = expensesResult.totalCents;

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
// meses se pidan: NUNCA se llama getFinancialReport una vez por mes. Deliberadamente SIN
// pendingTeachers (ver types.ts): es un saldo acumulado, no un gasto del mes.
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

interface TrendClassRecordRow {
  amount: number | null;
  occurred_at: string;
}

interface TrendExpenseRow {
  amount: number;
  expense_date: string;
}

/**
 * Últimos `monthsBack` meses (incluido el mes de `anchorDate`), oldest -> newest. Mismas 3 fuentes
 * de verdad que getFinancialReport (student_payments/paid_at, class_records/occurred_at,
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

  const [paymentsRes, classRecordsRes, expensesRes] = await Promise.all([
    supabase
      .from("student_payments")
      .select("amount, paid_at")
      .eq("status", "completed")
      .gte("paid_at", windowStart.toISOString())
      .lt("paid_at", windowEnd.toISOString())
      .returns<TrendPaymentRow[]>(),
    supabase
      .from("class_records")
      .select("amount, occurred_at")
      .in("status", ["present", "absent"])
      .not("amount", "is", null)
      .gte("occurred_at", windowStart.toISOString())
      .lt("occurred_at", windowEnd.toISOString())
      .returns<TrendClassRecordRow[]>(),
    supabase
      .from("business_expenses")
      .select("amount, expense_date")
      .gte("expense_date", windowStartDate)
      .lte("expense_date", windowEndDate)
      .returns<TrendExpenseRow[]>(),
  ]);

  if (paymentsRes.error) throw paymentsRes.error;
  if (classRecordsRes.error) throw classRecordsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  for (const row of paymentsRes.data) {
    if (!row.paid_at) continue;
    const bucket = byKey.get(monthKeyOf(row.paid_at));
    if (bucket) bucket.incomeCents += toCents(row.amount);
  }

  for (const row of classRecordsRes.data) {
    const bucket = byKey.get(monthKeyOf(row.occurred_at));
    if (bucket) bucket.teacherCostCents += toCents(row.amount ?? 0);
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
