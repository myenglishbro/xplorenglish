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
  /** SUM(teacher_hours_log.amount) atribuido por sessions.actual_end ∈ periodo. */
  generatedTeacherCost: number;
  /** SUM(teacher_payment_periods.total_amount) WHERE status='paid' AND paid_at ∈ periodo. */
  paidTeachers: number;
  /** Deuda docente acumulada a la fecha, TODAS las fechas -- misma fuente que Slice 3
   * (listTeacherDebtSummary), nunca una segunda fórmula. No depende del periodo seleccionado. */
  pendingTeachers: number;
  /** SUM(business_expenses.amount) WHERE expense_date ∈ periodo. */
  otherExpenses: number;
  /** collectedIncome - generatedTeacherCost - otherExpenses. */
  operatingResult: number;
  /** collectedIncome - paidTeachers - otherExpenses. */
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
