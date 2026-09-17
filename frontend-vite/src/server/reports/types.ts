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
   * real -- puede diferir de generatedTeacherCost del mismo periodo, y eso es correcto. */
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
