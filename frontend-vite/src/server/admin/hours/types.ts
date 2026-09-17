import type { PackageStatus } from "@/server/hours/types";
import type { HoursMovementType } from "@/server/payments/types";

/**
 * Vista admin de un paquete -- misma fuente de verdad que HoursPackageItem (server/hours/types.ts,
 * usado por /student/horas): remainingMinutes SIEMPRE es la suma de hours_movements.minutes_delta
 * para ese paquete, nunca se deriva de totalMinutes. consumedMinutes es un dato adicional, solo
 * informativo -- suma de |minutes_delta| donde movement_type='consumption' -- distinto del saldo:
 * puede no coincidir con totalMinutes-remainingMinutes si hubo refund/adjustment/expiration.
 */
export interface AdminHourPackageListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que el resto de *ListItem del proyecto.
  [key: string]: unknown;
  id: number;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentDni: string;
  packageLabel: string;
  totalMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  purchasedAt: string;
  status: PackageStatus;
}

/** Fila cruda del ledger (hours_movements) -- ningún cálculo, cada fila es un hecho ya registrado
 * por create_hour_package (compra) o register_class/correct_class (consumo, package_id siempre
 * null -- ver server/hours/queries.ts). set_student_session_billing/sessions ya no existen. */
export interface AdminHoursMovementItem {
  [key: string]: unknown;
  id: number;
  movementType: HoursMovementType;
  minutesDelta: number;
  notes: string | null;
  createdAt: string;
  createdByName: string;
  packageLabel: string | null;
}
