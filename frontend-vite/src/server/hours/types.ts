import type { Database } from "@/types/database.types";
import type { AttendanceStatus } from "@/server/scheduling/types";

export type PackageStatus = Database["public"]["Enums"]["package_status"];

/**
 * `remainingMinutes` NUNCA se infiere de `totalMinutes` -- se calcula sumando
 * `hours_movements.minutes_delta` para este paquete (el ledger, única fuente de verdad del
 * saldo). `totalMinutes` es solo lo comprado originalmente, un dato histórico fijo.
 */
export interface HoursPackageItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que SessionListItem/AttendanceRosterItem.
  [key: string]: unknown;
  id: number;
  packageLabel: string;
  totalMinutes: number;
  remainingMinutes: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: PackageStatus;
}

/**
 * `minutesCharged === null` significa "todavía no se decidió" -- mismo principio exacto que
 * `AttendanceRosterItem` (server/scheduling/types.ts): nunca es evidencia de asistencia
 * confirmada, es el valor inicial técnico hasta que un admin factura la sesión.
 */
export interface StudentAttendanceHistoryItem {
  [key: string]: unknown;
  attendanceId: number;
  sessionId: number;
  classroomName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AttendanceStatus;
  minutesCharged: number | null;
}

export interface StudentHoursSummary {
  /** Suma de remainingMinutes de los paquetes 'active' -- nunca de totalMinutes. */
  availableMinutes: number;
  activePackages: number;
  exhaustedPackages: number;
  expiredPackages: number;
}
