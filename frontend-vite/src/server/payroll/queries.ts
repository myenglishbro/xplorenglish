import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getMonthRangeInLima, type LimaDateRange } from "@/lib/datetime/lima";
import { getClassroomPeople } from "@/features/classroomOverview/api";
import {
  classRecordFinancialStatus,
  type MyStudentOption,
  type MyTeacherPaymentClassItem,
  type MyTeacherPaymentItem,
  type MyTeacherPaymentMonthlyPoint,
  type MyTeacherPaymentStudentItem,
  type PayTeacherClassesResult,
  type TeacherPaymentStatementRow,
  type TeacherPaymentSummaryItem,
} from "./types";

type Client = SupabaseClient<Database>;

/** Dinero en centavos enteros mientras se acumula -- mismo criterio aprobado en server/reports/
 * queries.ts (duplicado deliberadamente acá: no tocar FIX 5). */
function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Nombre de alumno por student_id, para docentes/alumnos que NO pueden leer profiles.first_name/
 * last_name del otro directamente (profiles_select, 0003, es "solo tu propia fila, o admin" --
 * bug diagnosticado en FIX 7). Reutiliza get_classroom_people (RPC SECURITY DEFINER ya existente y
 * autorizado, 0032_classroom_people.sql), una vez POR SALÓN (nunca por class_record), en paralelo.
 * Nota: get_classroom_people devuelve el alumno ACTUAL del salón (classrooms.student_id) -- si un
 * salón cambió de alumno, una clase histórica de un alumno anterior no se resuelve acá (no existe
 * ningún RPC RLS-safe para ese caso; se documenta como limitación conocida, nunca se inventa un
 * nombre).
 */
async function resolveStudentNamesByClassroom(supabase: Client, classroomIds: number[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const results = await Promise.all(classroomIds.map((id) => getClassroomPeople(supabase, id)));
  for (const people of results) {
    if (people.studentId && people.studentName) map.set(people.studentId, people.studentName);
  }
  return map;
}

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

export interface TeacherPayrollHeader {
  name: string;
  /** teacher_profiles.receipt_drive_url (FIX 2, segunda etapa) -- carpeta de Google Drive del
   * docente para recibos por honorarios; null si Admin todavía no la configuró. */
  receiptDriveUrl: string | null;
}

interface TeacherPayrollHeaderRow {
  first_name: string;
  last_name: string;
  teacher_profile: { receipt_drive_url: string | null } | null;
}

/**
 * Encabezado del estado de cuenta de un profesor (nombre + su carpeta de recibos en Drive) en un
 * solo round-trip -- mismo embed profiles -> teacher_profiles que ya usa el resto del proyecto
 * (ver server/admin/users/queries.ts), nunca una segunda query solo por el enlace de Drive.
 */
export async function getTeacherPayrollHeader(supabase: Client, teacherId: string): Promise<TeacherPayrollHeader> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, teacher_profile:teacher_profiles!teacher_profiles_profile_id_fkey(receipt_drive_url)")
    .eq("id", teacherId)
    .single()
    .returns<TeacherPayrollHeaderRow>();
  if (error) throw error;
  return {
    name: `${data.first_name} ${data.last_name}`,
    receiptDriveUrl: data.teacher_profile?.receipt_drive_url ?? null,
  };
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
  classroom_id: number;
  student_id: string | null;
  classroom: { name: string } | null;
  student: { id: string; first_name: string; last_name: string } | null;
  payment: { paid_at: string } | null;
}

/**
 * Estado de cuenta cronológico de un profesor (más reciente arriba) -- un solo round-trip vía
 * embeds de PostgREST (classroom, alumno, pago si existe). RLS admin-only ya cubierto por
 * class_records_admin_write/class_records_select (Slice A). `studentId` (FIX 8, opcional) filtra el
 * historial a un solo alumno -- Admin sigue llamando esta función sin ese argumento, sin cambios.
 *
 * NOMBRE DEL ALUMNO: el embed `student:profiles!...` funciona para Admin (is_admin() en
 * profiles_select) pero devuelve null cuando el caller es el propio Teacher (mismo bug diagnosticado
 * en FIX 7). Para esos casos se resuelve vía resolveStudentNamesByClassroom (RPC get_classroom_people,
 * batch por salón) -- nunca afecta la ruta de Admin, que ya resuelve todo con el embed.
 */
export async function getTeacherPaymentStatement(supabase: Client, teacherId: string, studentId?: string): Promise<TeacherPaymentStatementRow[]> {
  let query = supabase
    .from("class_records")
    .select(
      `
      id, occurred_at, status, minutes, notes, hourly_rate_snapshot, amount, teacher_payment_id, classroom_id, student_id,
      classroom:classrooms(name),
      student:profiles!class_records_student_id_fkey(id, first_name, last_name),
      payment:teacher_payments(paid_at)
    `,
    )
    .eq("teacher_id", teacherId);
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query.order("occurred_at", { ascending: false }).returns<StatementRawRow[]>();
  if (error) throw error;

  const missingClassroomIds = [...new Set(data.filter((r) => r.student_id && !r.student).map((r) => r.classroom_id))];
  const fallbackNames = missingClassroomIds.length > 0 ? await resolveStudentNamesByClassroom(supabase, missingClassroomIds) : new Map<string, string>();

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
    studentId: row.student_id,
    studentName: row.student
      ? `${row.student.first_name} ${row.student.last_name}`
      : row.student_id
        ? (fallbackNames.get(row.student_id) ?? "—")
        : "—",
    financialStatus: classRecordFinancialStatus(row.status, row.teacher_payment_id),
  }));
}

// ================================================================================================
// Reporte financiero de Teacher -> Mis pagos (FIX 6, segunda etapa) -- SIEMPRE self-scoped: cada
// función recibe `teacherId`, pero el único caller (features/payroll/hooks.ts) SIEMPRE lo llama con
// el id del usuario autenticado (auth.uid()), nunca con un valor proveniente de la UI/URL/formulario.
// Además de RLS (teacher_payments_select_own, class_records_select -- ambas sin cambios), cada query
// filtra explícitamente `teacher_id = teacherId` como defensa en profundidad: class_records_select
// también permite lectura a CUALQUIER profesor activo del mismo salón (is_classroom_teacher), así
// que sin este filtro un docente podría, en teoría, leer clases de OTRO profesor que comparte salón
// con él si adivinara un teacher_payment_id ajeno. Fuente de verdad: teacher_payments, atribuido por
// paid_at (nunca class_records.occurred_at) -- mismos principios que FIX 5 (Admin), pero sin
// compartir sus queries (que aceptan cualquier teacherId) para no debilitar el aislamiento del Teacher.
// ================================================================================================

interface MyTeacherPaymentRow {
  id: number;
  paid_at: string;
  total_minutes: number;
  total_amount: number;
  reference: string | null;
}

interface MyTeacherPaymentClassCountRow {
  teacher_payment_id: number | null;
}

/** Pagos reales del docente autenticado en el periodo, más compacto (id + agregados oficiales) --
 * NUNCA una query por pago para el conteo de clases: un solo `IN` con todos los ids del periodo. */
export async function listMyTeacherPayments(supabase: Client, teacherId: string, range: LimaDateRange): Promise<MyTeacherPaymentItem[]> {
  const { data: payments, error } = await supabase
    .from("teacher_payments")
    .select("id, paid_at, total_minutes, total_amount, reference")
    .eq("teacher_id", teacherId)
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString())
    .order("paid_at", { ascending: false })
    .returns<MyTeacherPaymentRow[]>();

  if (error) throw error;
  if (payments.length === 0) return [];

  const paymentIds = payments.map((p) => p.id);
  const { data: classCounts, error: classCountsError } = await supabase
    .from("class_records")
    .select("teacher_payment_id")
    .eq("teacher_id", teacherId)
    .in("teacher_payment_id", paymentIds)
    .returns<MyTeacherPaymentClassCountRow[]>();
  if (classCountsError) throw classCountsError;

  const classCountByPayment = new Map<number, number>();
  for (const row of classCounts) {
    if (row.teacher_payment_id === null) continue;
    classCountByPayment.set(row.teacher_payment_id, (classCountByPayment.get(row.teacher_payment_id) ?? 0) + 1);
  }

  return payments.map((p) => ({
    id: p.id,
    paidAt: p.paid_at,
    classCount: classCountByPayment.get(p.id) ?? 0,
    minutes: p.total_minutes,
    totalAmount: p.total_amount,
    reference: p.reference,
  }));
}

interface MyTeacherPaymentClassRow {
  id: number;
  occurred_at: string;
  minutes: number;
  hourly_rate_snapshot: number | null;
  amount: number | null;
  classroom_id: number;
  student_id: string | null;
  student: { first_name: string; last_name: string } | null;
}

/**
 * Detalle de clases de UN pago propio -- bajo demanda, solo cuando el docente abre un pago puntual.
 * Primero confirma que el pago pertenece al docente autenticado (defensa en profundidad, ver nota de
 * arriba): si `teacher_payment_id` no es de este `teacherId`, devuelve [] en vez de filtrar
 * silenciosamente clases de otro profesor. hourlyRateSnapshot/amount son el valor histórico de cada
 * class_record, NUNCA la tarifa actual del docente. `studentId` (FIX 8, opcional) restringe el
 * detalle a las clases de ese alumno dentro del pago -- respeta el filtro activo de la pantalla.
 * NOMBRE DEL ALUMNO: mismo fallback que getTeacherPaymentStatement (ver resolveStudentNamesByClassroom)
 * -- el embed a profiles no resuelve nada para un caller Teacher (profiles_select, FIX 7).
 */
export async function getMyTeacherPaymentClassDetail(
  supabase: Client,
  teacherId: string,
  teacherPaymentId: number,
  studentId?: string,
): Promise<MyTeacherPaymentClassItem[]> {
  const { data: payment, error: paymentError } = await supabase
    .from("teacher_payments")
    .select("id")
    .eq("id", teacherPaymentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) return [];

  let query = supabase
    .from("class_records")
    .select(
      `
      id, occurred_at, minutes, hourly_rate_snapshot, amount, classroom_id, student_id,
      student:profiles!class_records_student_id_fkey(first_name, last_name)
    `,
    )
    .eq("teacher_payment_id", teacherPaymentId)
    .eq("teacher_id", teacherId);
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query.order("occurred_at", { ascending: true }).returns<MyTeacherPaymentClassRow[]>();
  if (error) throw error;
  if (data.length === 0) return [];

  const missingClassroomIds = [...new Set(data.filter((r) => r.student_id && !r.student).map((r) => r.classroom_id))];
  const fallbackNames = missingClassroomIds.length > 0 ? await resolveStudentNamesByClassroom(supabase, missingClassroomIds) : new Map<string, string>();

  return data.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    studentName: row.student
      ? `${row.student.first_name} ${row.student.last_name}`
      : row.student_id
        ? (fallbackNames.get(row.student_id) ?? "—")
        : "—",
    minutes: row.minutes,
    hourlyRateSnapshot: row.hourly_rate_snapshot,
    amount: row.amount,
  }));
}

function myPaymentsMonthKeyOf(dateStr: string): string {
  return getMonthRangeInLima(new Date(dateStr)).startDate.slice(0, 7);
}

function myPaymentsShiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

function myPaymentsMonthLabelEs(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y as number, (m as number) - 1, 1));
  return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

interface MyTeacherPaymentTrendRow {
  paid_at: string;
  total_amount: number;
}

/**
 * Últimos `monthsBack` meses (incluido el mes de `anchorDate`), oldest -> newest -- SUM(total_amount)
 * agrupado por mes de paid_at, del docente autenticado. Un solo round-trip (ventana completa, nunca
 * una query por mes); los meses sin pagos quedan en 0 para mantener continuidad temporal. Mismo
 * criterio que getFinancialMonthlyTrend (Admin, FIX 5/Slice 4), pero self-scoped por teacher_id --
 * duplicado deliberadamente en vez de importar desde server/reports/queries.ts (no tocar FIX 5).
 */
export async function getMyTeacherPaymentsMonthlyTrend(
  supabase: Client,
  teacherId: string,
  monthsBack: number,
  anchorDate: Date = new Date(),
): Promise<MyTeacherPaymentMonthlyPoint[]> {
  const currentMonthKey = getMonthRangeInLima(anchorDate).startDate.slice(0, 7);

  const buckets = Array.from({ length: monthsBack }, (_, i) => {
    const key = myPaymentsShiftMonthKey(currentMonthKey, -(monthsBack - 1 - i));
    const range = getMonthRangeInLima(new Date(`${key}-15T12:00:00Z`));
    return { key, label: myPaymentsMonthLabelEs(key), range, cents: 0 };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  const windowStart = buckets[0]!.range.start;
  const windowEnd = buckets[buckets.length - 1]!.range.end;

  const { data, error } = await supabase
    .from("teacher_payments")
    .select("paid_at, total_amount")
    .eq("teacher_id", teacherId)
    .gte("paid_at", windowStart.toISOString())
    .lt("paid_at", windowEnd.toISOString())
    .returns<MyTeacherPaymentTrendRow[]>();

  if (error) throw error;

  for (const row of data) {
    const bucket = byKey.get(myPaymentsMonthKeyOf(row.paid_at));
    if (bucket) bucket.cents += Math.round(Number(row.total_amount) * 100);
  }

  return buckets.map((b) => ({ monthKey: b.key, monthLabel: b.label, totalAmount: b.cents / 100 }));
}

// ================================================================================================
// Filtro por alumno de Teacher -> Mis pagos (FIX 8, segunda etapa) -- SIEMPRE self-scoped por
// teacherId (sesión autenticada); studentId siempre proviene de listMyStudentsForTeacher (nunca de
// la UI directamente). La atribución económica por alumno se deriva SIEMPRE de class_records
// (amount/minutes propios), NUNCA de teacher_payments.total_amount/total_minutes completos -- un
// pago puede agrupar clases de varios alumnos. El periodo sigue determinado por teacher_payments.
// paid_at, nunca class_records.occurred_at (una clase de agosto pagada en septiembre pertenece a
// septiembre, igual que en la vista sin filtro).
// ================================================================================================

interface MyStudentClassRow {
  student_id: string;
  classroom_id: number;
}

/**
 * Alumnos históricos del docente autenticado -- derivado de class_records.teacher_id (TODAS sus
 * clases, no solo classrooms actualmente activos), para que un alumno con salón archivado pero
 * clases/pagos históricos no desaparezca del selector. Nombres resueltos vía
 * resolveStudentNamesByClassroom (nunca profiles directo). 2 round-trips fijos (class_records ->
 * get_classroom_people por salón único, en paralelo), independiente del número de clases.
 */
export async function listMyStudentsForTeacher(supabase: Client, teacherId: string): Promise<MyStudentOption[]> {
  const { data, error } = await supabase.from("class_records").select("student_id, classroom_id").eq("teacher_id", teacherId).returns<MyStudentClassRow[]>();
  if (error) throw error;
  if (data.length === 0) return [];

  const classroomIds = [...new Set(data.map((r) => r.classroom_id))];
  const nameByStudent = await resolveStudentNamesByClassroom(supabase, classroomIds);

  const studentIds = [...new Set(data.map((r) => r.student_id))];
  return studentIds
    .map((id) => ({ studentId: id, studentName: nameByStudent.get(id) ?? "Alumno" }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

interface MyTeacherPaymentForStudentRow {
  id: number;
  paid_at: string;
  reference: string | null;
}

interface MyTeacherPaymentForStudentClassRow {
  teacher_payment_id: number | null;
  minutes: number;
  amount: number | null;
}

/**
 * Porción atribuible a UN alumno dentro de los teacher_payments del docente en el periodo -- SOLO
 * class_records con teacher_payment_id NOT NULL (clases ya pagadas), nunca deuda pendiente. Solo
 * incluye pagos que efectivamente contienen al menos una clase de ese alumno (los demás ni
 * aparecen). 2 round-trips fijos (teacher_payments del periodo -> class_records del alumno en esos
 * ids), nunca uno por pago.
 */
export async function listMyTeacherPaymentsForStudent(
  supabase: Client,
  teacherId: string,
  studentId: string,
  range: LimaDateRange,
): Promise<MyTeacherPaymentStudentItem[]> {
  const { data: payments, error } = await supabase
    .from("teacher_payments")
    .select("id, paid_at, reference")
    .eq("teacher_id", teacherId)
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString())
    .returns<MyTeacherPaymentForStudentRow[]>();
  if (error) throw error;
  if (payments.length === 0) return [];

  const paymentIds = payments.map((p) => p.id);
  const { data: classRecords, error: classError } = await supabase
    .from("class_records")
    .select("teacher_payment_id, minutes, amount")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .in("teacher_payment_id", paymentIds)
    .returns<MyTeacherPaymentForStudentClassRow[]>();
  if (classError) throw classError;

  const aggByPayment = new Map<number, { count: number; minutes: number; cents: number }>();
  for (const row of classRecords) {
    if (row.teacher_payment_id === null) continue;
    const entry = aggByPayment.get(row.teacher_payment_id) ?? { count: 0, minutes: 0, cents: 0 };
    entry.count += 1;
    entry.minutes += row.minutes;
    entry.cents += toCents(row.amount ?? 0);
    aggByPayment.set(row.teacher_payment_id, entry);
  }

  return payments
    .filter((p) => aggByPayment.has(p.id))
    .map((p) => {
      const agg = aggByPayment.get(p.id)!;
      return { id: p.id, paidAt: p.paid_at, classCount: agg.count, minutes: agg.minutes, amount: agg.cents / 100, reference: p.reference };
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

interface MyTeacherPaymentTrendForStudentRow {
  teacher_payment_id: number | null;
  amount: number | null;
}

/**
 * Tendencia mensual filtrada por alumno -- SUM(class_records.amount) del alumno, agrupado por el
 * MES DE paid_at de su teacher_payment (nunca por occurred_at): una clase de agosto pagada en
 * septiembre suma en la barra de septiembre. 2 round-trips fijos (teacher_payments de la ventana ->
 * class_records del alumno en esos ids), nunca uno por mes ni uno por pago.
 */
export async function getMyTeacherPaymentsMonthlyTrendForStudent(
  supabase: Client,
  teacherId: string,
  studentId: string,
  monthsBack: number,
  anchorDate: Date = new Date(),
): Promise<MyTeacherPaymentMonthlyPoint[]> {
  const currentMonthKey = getMonthRangeInLima(anchorDate).startDate.slice(0, 7);

  const buckets = Array.from({ length: monthsBack }, (_, i) => {
    const key = myPaymentsShiftMonthKey(currentMonthKey, -(monthsBack - 1 - i));
    const range = getMonthRangeInLima(new Date(`${key}-15T12:00:00Z`));
    return { key, label: myPaymentsMonthLabelEs(key), range, cents: 0 };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  const windowStart = buckets[0]!.range.start;
  const windowEnd = buckets[buckets.length - 1]!.range.end;

  const { data: payments, error } = await supabase
    .from("teacher_payments")
    .select("id, paid_at")
    .eq("teacher_id", teacherId)
    .gte("paid_at", windowStart.toISOString())
    .lt("paid_at", windowEnd.toISOString())
    .returns<{ id: number; paid_at: string }[]>();
  if (error) throw error;
  if (payments.length === 0) return buckets.map((b) => ({ monthKey: b.key, monthLabel: b.label, totalAmount: 0 }));

  const paidAtByPayment = new Map(payments.map((p) => [p.id, p.paid_at]));
  const paymentIds = payments.map((p) => p.id);

  const { data: classRecords, error: classError } = await supabase
    .from("class_records")
    .select("teacher_payment_id, amount")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .in("teacher_payment_id", paymentIds)
    .returns<MyTeacherPaymentTrendForStudentRow[]>();
  if (classError) throw classError;

  for (const row of classRecords) {
    if (row.teacher_payment_id === null) continue;
    const paidAt = paidAtByPayment.get(row.teacher_payment_id);
    if (!paidAt) continue;
    const bucket = byKey.get(myPaymentsMonthKeyOf(paidAt));
    if (bucket) bucket.cents += toCents(row.amount ?? 0);
  }

  return buckets.map((b) => ({ monthKey: b.key, monthLabel: b.label, totalAmount: b.cents / 100 }));
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
