import type { Database } from "@/types/database.types";
import type { PackageStatus } from "@/server/hours/types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type HoursMovementType = Database["public"]["Enums"]["hours_movement_type"];

/** Mismo shape que SchedulingActionState/ContentActionState -- consistente en todo el proyecto. */
export type PaymentsActionState<T = never> = { error?: string; fieldErrors?: Record<string, string>; data?: T };

export interface PaymentListItem {
  [key: string]: unknown;
  id: number;
  studentId: string;
  studentName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  /** null si, por alguna anomalía, el pago no tiene paquete asociado -- no debería ocurrir vía
   * create_hour_package (siempre crea ambos juntos), pero la relación no está reforzada por un
   * UNIQUE a nivel de DB, así que se maneja como posible. */
  packageId: number | null;
  packageLabel: string | null;
  totalMinutes: number | null;
  packageStatus: PackageStatus | null;
}

export interface HoursMovementItem {
  id: number;
  movementType: HoursMovementType;
  minutesDelta: number;
  notes: string | null;
  createdAt: string;
  createdByName: string;
}

export interface PaymentDetail {
  id: number;
  studentId: string;
  studentName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
  package: {
    id: number;
    packageLabel: string;
    totalMinutes: number;
    /** SIEMPRE calculado sumando hours_movements.minutes_delta -- nunca desde totalMinutes. */
    remainingMinutes: number;
    pricePaid: number;
    purchasedAt: string;
    expiresAt: string | null;
    status: PackageStatus;
  } | null;
  ledger: HoursMovementItem[];
  hasProof: boolean;
}

export interface CreateHourPackageResult {
  paymentId: number;
  packageId: number;
  movementId: number;
}

export interface PaymentListFilters {
  studentId?: string;
  status?: PaymentStatus;
}
