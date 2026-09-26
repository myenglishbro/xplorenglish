import type { ExpenseCategory } from "@/server/expenses/types";

export interface FinancialReportPeriod {
  /** Instantes UTC reales [start, end) -- lo que se usó para filtrar paid_at/actual_end. */
  start: string;
  end: string;
  /** "YYYY-MM-DD" ambos inclusive -- lo que se usó para filtrar expense_date. */
  startDate: string;
  endDate: string;
}

export interface FinancialReportKpis {
  /** SUM(student_payments.amount) WHERE status='completed' AND paid_at ∈ periodo. */
  collectedIncome: number;
  /** "Costo docente generado": SUM(class_records.amount) WHERE status IN ('present','absent') AND
   * amount IS NOT NULL, atribuido por occurred_at ∈ periodo. Se cuenta aunque todavía no se le haya
   * pagado al profesor -- es una obligación generada, no una salida de caja. */
  generatedTeacherCost: number;
  /** "Docentes pagados": SUM(teacher_payments.total_amount) WHERE paid_at ∈ periodo. Salida de caja
   * real -- puede diferir de generatedTeacherCost del mismo periodo, y eso es correcto. Exactamente
   * reconciliable con SUM(FinancialReport.teacherPayments[].totalAmount) del mismo periodo (FIX 5,
   * misma fuente/mismo filtro -- nunca dos cálculos separados). */
  paidTeachers: number;
  /** "Deuda docente actual": SUM(class_records.amount) WHERE status IN ('present','absent') AND
   * amount IS NOT NULL AND teacher_payment_id IS NULL, SIEMPRE a la fecha actual -- nunca una
   * segunda fórmula ni acotada a `range` (stock, no flujo del periodo). */
  pendingTeachers: number;
  /** SUM(business_expenses.amount) WHERE expense_date ∈ periodo. NUNCA incluye teacher_payments. */
  otherExpenses: number;
  /** "Resultado operativo" (NO "ganancia neta"): collectedIncome - generatedTeacherCost -
   * otherExpenses. */
  operatingResult: number;
  /** "Flujo de caja": collectedIncome - paidTeachers - otherExpenses. */
  cashFlow: number;
}

export interface SalesDetailItem {
  [key: string]: unknown;
  id: number;
  /** student_payments.paid_at -- nunca created_at. */
  paidAt: string;
  studentName: string;
  /** hours_packages.package_label del paquete asociado, si existe -- nunca un segundo importe. */
  concept: string;
  paymentMethod: string;
  amount: number;
}

export interface TeacherCostDetailItem {
  [key: string]: unknown;
  teacherId: string;
  teacherName: string;
  minutes: number;
  amount: number;
}

/** Un pago REAL a un docente (FIX 5) -- fuente de verdad: teacher_payments, atribuido por
 * paid_at (nunca class_records.occurred_at). totalAmount/minutes son los valores oficiales
 * almacenados en el propio pago (teacher_payments.total_amount/total_minutes), NUNCA
 * recalculados sumando class_records -- classCount es el único dato derivado (conteo de
 * class_records.teacher_payment_id = este pago). */
export interface TeacherPaymentDetailItem {
  [key: string]: unknown;
  id: number;
  teacherId: string;
  teacherName: string;
  paidAt: string;
  classCount: number;
  minutes: number;
  totalAmount: number;
  reference: string | null;
}

/** Una clase incluida en un teacher_payment (detalle expandible de TeacherPaymentDetailItem).
 * hourlyRateSnapshot/amount son el valor histórico de ESA clase (class_records), nunca la
 * tarifa actual del profesor. */
export interface TeacherPaymentClassItem {
  [key: string]: unknown;
  id: number;
  occurredAt: string;
  studentName: string;
  minutes: number;
  hourlyRateSnapshot: number | null;
  amount: number | null;
}

/** Mejora posterior a la Segunda Etapa: cómo se interpreta el rango Desde/Hasta de "Pagos
 * realizados a docentes". "payment_date" es el comportamiento existente (teacher_payments.paid_at,
 * FIX 5, sin cambios). "class_date" es nuevo: el rango se aplica a class_records.occurred_at,
 * mostrando solo la PORCIÓN de cada teacher_payment cuyas clases caen dentro del rango -- nunca el
 * total histórico del pago. Semántica explícita a propósito (nunca un boolean). */
export type TeacherPaymentPeriodMode = "payment_date" | "class_date";

/** Un teacher_payment representado por la PORCIÓN de sus clases cuyo occurred_at cae dentro del
 * rango consultado (modo "class_date") -- fuente de verdad: class_records con
 * teacher_payment_id IS NOT NULL, agregadas SOLO entre las que cumplen el rango. `paidAt` es la
 * fecha real del pago (teacher_payments.paid_at), que puede estar fuera del rango consultado a
 * propósito: la dimensión temporal filtrada acá es occurred_at, no paid_at. classCount/minutes/
 * amount son sumas de ESTA porción, nunca los totales oficiales del teacher_payment completo.
 * classDateFrom/classDateTo son MIN/MAX(occurred_at) solo entre las clases de esta porción. */
export interface TeacherPaymentClassRangeItem {
  [key: string]: unknown;
  id: number;
  teacherId: string;
  teacherName: string;
  paidAt: string;
  classCount: number;
  minutes: number;
  amount: number;
  classDateFrom: string;
  classDateTo: string;
}

export interface ExpenseDetailItem {
  [key: string]: unknown;
  id: number;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
}

export interface FinancialReport {
  period: FinancialReportPeriod;
  kpis: FinancialReportKpis;
  sales: SalesDetailItem[];
  teachers: TeacherCostDetailItem[];
  /** Pagos reales realizados a docentes en el periodo (FIX 5) -- distinto de `teachers` (costo
   * GENERADO, atribuido por occurred_at). El detalle de clases de cada pago se pide aparte, bajo
   * demanda, cuando Administración abre un pago (ver getTeacherPaymentClassDetail). */
  teacherPayments: TeacherPaymentDetailItem[];
  expenses: ExpenseDetailItem[];
}

/** Un punto del gráfico "Ingresos vs. gastos" -- deliberadamente SIN pendingTeachers (es un saldo
 * acumulado, no un gasto del mes; incluirlo aquí lo haría lucir como un costo mensual más, doble
 * contando conceptualmente contra generatedTeacherCost). */
export interface FinancialMonthlyTrendPoint {
  [key: string]: unknown;
  /** "YYYY-MM" -- clave estable para keys de React/ordenar, nunca para mostrar. */
  monthKey: string;
  /** Ej. "sep 2026" -- ya en español, listo para mostrar. */
  monthLabel: string;
  collectedIncome: number;
  generatedTeacherCost: number;
  otherExpenses: number;
}
