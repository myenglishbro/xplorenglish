import type { Database } from "@/types/database.types";
import type { TagTone } from "@/components/ui/core/Tag";
import type { PackageStatus } from "@/server/hours/types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type HoursMovementType = Database["public"]["Enums"]["hours_movement_type"];

/** Estado ADMINISTRATIVO/DOCUMENTARIO de la boleta/comprobante de VENTA (FIX 11, segunda etapa) --
 * dominio independiente de PaymentStatus. NUNCA confundir con PaymentProofSection (evidencia de que
 * el estudiante pagó) ni con teacher_profiles.receipt_drive_url (FIX 2, recibos por honorarios de
 * DOCENTES) -- los 3 son conceptos completamente distintos. */
export type ReceiptStatus = Database["public"]["Enums"]["receipt_status"];

/** Sentinel para filtrar explícitamente receipt_status IS NULL ("Sin registrar") -- distinto de
 * "sin filtro" (ausencia del campo). Nunca un truthy-check simple, que haría imposible distinguir
 * "filtrar por NULL" de "no filtrar". */
export type ReceiptStatusFilter = ReceiptStatus | "unregistered";

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  pending: "Pendiente",
  issued: "Emitida",
  sent: "Enviada",
  not_applicable: "No aplica",
};

export const RECEIPT_STATUS_TONE: Record<ReceiptStatus, TagTone> = {
  pending: "warning",
  issued: "accent",
  sent: "success",
  not_applicable: "neutral",
};

/** Label para receipt_status = NULL (histórico sin clasificar) -- NUNCA un valor del enum. */
export const RECEIPT_STATUS_UNREGISTERED_LABEL = "Sin registrar";

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
  /** null = histórico sin clasificar ("Sin registrar" en UI) -- ver ReceiptStatus. */
  receiptStatus: ReceiptStatus | null;
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
  /** Estado de boleta/comprobante de venta (FIX 11) -- null = histórico sin clasificar. */
  receiptStatus: ReceiptStatus | null;
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
  receiptStatus?: ReceiptStatusFilter;
}
