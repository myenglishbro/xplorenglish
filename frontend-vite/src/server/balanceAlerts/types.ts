/**
 * Slice G -- fila de get_student_balance_alerts(): un estudiante con saldo <= 120 min (SIN SALDO o
 * SALDO BAJO; NORMAL nunca aparece acá, filtrado en la propia RPC). classroomId/classroomName es
 * el salón de referencia para navegar ("Ver salón") -- puede ser null (estudiante sin salón activo,
 * caso Admin) o corresponder al salón donde el docente lo ve (caso Teacher).
 */
export interface StudentBalanceAlertItem {
  [key: string]: unknown;
  studentId: string;
  studentName: string;
  balance: number;
  classroomId: number | null;
  classroomName: string | null;
}
