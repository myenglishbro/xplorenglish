import type { Database } from "@/types/database.types";
import type { TagTone } from "@/components/ui/core/Tag";

export type PackageStatus = Database["public"]["Enums"]["package_status"];
export type ClassRecordStatus = Database["public"]["Enums"]["class_record_status"];

/** Único lugar con las 5 etiquetas/tonos de package_status -- reutilizado por las tablas de
 * paquetes de Admin y Student, y por el detalle de pago. Ciclo de vida (versión reducida):
 * cancelled/refunded se agregan sin quitar los 3 estados existentes (active/exhausted/expired). */
export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  active: "Activo",
  exhausted: "Agotado",
  expired: "Vencido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const PACKAGE_STATUS_TONE: Record<PackageStatus, TagTone> = {
  active: "success",
  exhausted: "neutral",
  expired: "danger",
  cancelled: "neutral",
  refunded: "warning",
};

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

/** Fuente única class_records (Slice A/F) -- cada fila ya nace con status/minutos definitivos, sin
 * el estado transitorio "pendiente de facturación" del modelo viejo. */
export interface StudentAttendanceHistoryItem {
  [key: string]: unknown;
  classRecordId: number;
  classroomName: string;
  occurredAt: string;
  status: ClassRecordStatus;
  minutes: number;
}

export interface StudentHoursSummary {
  /** Suma de remainingMinutes de los paquetes 'active' -- nunca de totalMinutes. */
  availableMinutes: number;
  activePackages: number;
  exhaustedPackages: number;
  expiredPackages: number;
}
