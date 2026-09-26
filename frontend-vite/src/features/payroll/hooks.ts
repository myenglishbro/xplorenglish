import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type { LimaDateRange } from "@/lib/datetime/lima";
import {
  getTeacherPaymentStatement,
  listMyTeacherPayments,
  getMyTeacherPaymentClassDetail,
  getMyTeacherPaymentsMonthlyTrend,
  listMyStudentsForTeacher,
  listMyTeacherPaymentsForStudent,
  getMyTeacherPaymentsMonthlyTrendForStudent,
} from "@/server/payroll/queries";

/**
 * "Mis pagos" (Teacher) -- fix post-Slice F: reemplaza el flujo viejo de periodos/recibos
 * (teacher_payment_periods/teacher_receipts, eliminado en Slice A/E) con una lectura mínima de solo
 * lectura sobre la misma fuente que ya usa Admin (getTeacherPaymentStatement, Slice E):
 * class_records + teacher_payments. Sin checkboxes ni acción de pago -- eso es exclusivo de Admin.
 * `studentId` (FIX 8, opcional) filtra el historial a un solo alumno.
 */
export function useMyPaymentStatement(studentId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-payment-statement", user?.id, studentId ?? null],
    queryFn: () => getTeacherPaymentStatement(supabase, user!.id, studentId ?? undefined),
    enabled: !!user,
  });
}

/**
 * Reporte financiero de "Mis pagos" (FIX 6, segunda etapa) -- pagos REALES (teacher_payments) del
 * periodo seleccionado. `user.id` viene siempre de la sesión autenticada (useAuth), nunca de un
 * parámetro externo -- el docente nunca puede pedir el reporte de otro teacherId. `enabled` (FIX 8)
 * permite desactivarla mientras hay un alumno seleccionado (se usa useMyTeacherPaymentsForStudent
 * en su lugar), para no pedir ambas vistas a la vez.
 */
export function useMyTeacherPayments(range: LimaDateRange, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teacher-payments", user?.id, range.startDate, range.endDate],
    queryFn: () => listMyTeacherPayments(supabase, user!.id, range),
    enabled: !!user && enabled,
  });
}

/** Detalle de clases de UN pago propio -- bajo demanda, solo mientras el modal de detalle está
 * abierto (`enabled`), nunca precargado para toda la lista de pagos. `studentId` (FIX 8, opcional)
 * restringe el detalle a las clases de ese alumno dentro del pago. */
export function useMyTeacherPaymentClassDetail(teacherPaymentId: number | null, studentId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teacher-payment-class-detail", user?.id, teacherPaymentId, studentId ?? null],
    queryFn: () => getMyTeacherPaymentClassDetail(supabase, user!.id, teacherPaymentId as number, studentId ?? undefined),
    enabled: !!user && teacherPaymentId !== null,
  });
}

/** Tendencia mensual de pagos recibidos (últimos N meses) para el gráfico de "Mis pagos". `enabled`
 * (FIX 8) la desactiva mientras hay un alumno seleccionado. */
export function useMyTeacherPaymentsMonthlyTrend(monthsBack: number, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teacher-payments-trend", user?.id, monthsBack],
    queryFn: () => getMyTeacherPaymentsMonthlyTrend(supabase, user!.id, monthsBack),
    enabled: !!user && enabled,
  });
}

/** Opciones del selector "Alumno" (FIX 8) -- alumnos históricos del docente autenticado, derivados
 * de sus propios class_records (nunca solo classrooms activos). */
export function useMyStudentsForTeacher() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-students-for-teacher", user?.id] as const,
    queryFn: () => listMyStudentsForTeacher(supabase, user!.id),
    enabled: !!user,
  });
}

/** Pagos reales del periodo, filtrados a la porción de UN alumno (FIX 8) -- solo se activa cuando
 * hay un alumno seleccionado (`enabled`). */
export function useMyTeacherPaymentsForStudent(studentId: string | null, range: LimaDateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teacher-payments-for-student", user?.id, studentId, range.startDate, range.endDate],
    queryFn: () => listMyTeacherPaymentsForStudent(supabase, user!.id, studentId as string, range),
    enabled: !!user && studentId !== null,
  });
}

/** Tendencia mensual filtrada a UN alumno (FIX 8) -- solo se activa cuando hay un alumno
 * seleccionado. */
export function useMyTeacherPaymentsMonthlyTrendForStudent(studentId: string | null, monthsBack: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teacher-payments-trend-for-student", user?.id, studentId, monthsBack],
    queryFn: () => getMyTeacherPaymentsMonthlyTrendForStudent(supabase, user!.id, studentId as string, monthsBack),
    enabled: !!user && studentId !== null,
  });
}
