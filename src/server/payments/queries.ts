import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { paymentProofExists } from "@/lib/storage/paymentProofs";
import type { HoursMovementItem, PaymentDetail, PaymentListFilters, PaymentListItem } from "./types";

type Client = SupabaseClient<Database>;

interface PaymentListRow {
  id: number;
  student_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: Database["public"]["Enums"]["payment_status"];
  paid_at: string | null;
  created_at: string;
  student: { first_name: string; last_name: string } | null;
  hours_packages: { id: number; package_label: string; total_minutes: number; status: Database["public"]["Enums"]["package_status"] }[];
}

/**
 * Vista admin -- RLS (student_payments_select_own, 0007) ya permite a un admin ver todas las
 * filas, no solo las propias. `hours_packages` se embebe como arreglo porque no hay un UNIQUE en
 * `payment_id` a nivel de DB (el 1:1 lo garantiza hoy create_hour_package por construcción, no un
 * constraint) -- se toma el primero, defensivamente.
 */
export async function listStudentPayments(supabase: Client, filters: PaymentListFilters = {}): Promise<PaymentListItem[]> {
  let query = supabase
    .from("student_payments")
    .select(
      `
      id, student_id, amount, currency, payment_method, status, paid_at, created_at,
      student:profiles!student_payments_student_id_fkey(first_name,last_name),
      hours_packages(id, package_label, total_minutes, status)
    `
    )
    .order("created_at", { ascending: false });

  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.returns<PaymentListRow[]>();
  if (error) throw error;

  return data.map((row) => {
    const pkg = row.hours_packages[0] ?? null;
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "Estudiante",
      amount: row.amount,
      currency: row.currency,
      paymentMethod: row.payment_method,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      packageId: pkg?.id ?? null,
      packageLabel: pkg?.package_label ?? null,
      totalMinutes: pkg?.total_minutes ?? null,
      packageStatus: pkg?.status ?? null,
    };
  });
}

interface PaymentDetailRow {
  id: number;
  student_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: Database["public"]["Enums"]["payment_status"];
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  student: { first_name: string; last_name: string } | null;
  hours_packages: {
    id: number;
    package_label: string;
    total_minutes: number;
    price_paid: number;
    purchased_at: string;
    expires_at: string | null;
    status: Database["public"]["Enums"]["package_status"];
  }[];
}

interface MovementRow {
  id: number;
  movement_type: Database["public"]["Enums"]["hours_movement_type"];
  minutes_delta: number;
  notes: string | null;
  created_at: string;
  created_by_profile: { first_name: string; last_name: string } | null;
}

export async function getPaymentDetail(supabase: Client, paymentId: number): Promise<PaymentDetail | null> {
  const { data: paymentRow, error: paymentError } = await supabase
    .from("student_payments")
    .select(
      `
      id, student_id, amount, currency, payment_method, status, reference, paid_at, created_at,
      student:profiles!student_payments_student_id_fkey(first_name,last_name),
      hours_packages(id, package_label, total_minutes, price_paid, purchased_at, expires_at, status)
    `
    )
    .eq("id", paymentId)
    .maybeSingle()
    .returns<PaymentDetailRow | null>();

  if (paymentError) throw paymentError;
  if (!paymentRow) return null;

  const pkg = paymentRow.hours_packages[0] ?? null;

  let ledger: HoursMovementItem[] = [];
  let remainingMinutes = 0;
  let hasProof = false;

  if (pkg) {
    const [{ data: movementRows, error: movementsError }, proofExists] = await Promise.all([
      supabase
        .from("hours_movements")
        .select(
          `
          id, movement_type, minutes_delta, notes, created_at,
          created_by_profile:profiles!hours_movements_created_by_fkey(first_name,last_name)
        `
        )
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: true })
        .returns<MovementRow[]>(),
      paymentProofExists(supabase, paymentRow.student_id, paymentId),
    ]);

    if (movementsError) throw movementsError;

    // Saldo actual = SUM(minutes_delta) del ledger -- NUNCA total_minutes. Misma regla exacta que
    // server/hours/queries.ts (getStudentHoursPackages), aplicada acá para un solo paquete visto
    // desde el lado admin en vez de "todos los propios del estudiante autenticado".
    remainingMinutes = movementRows.reduce((sum, m) => sum + m.minutes_delta, 0);
    hasProof = proofExists;

    ledger = movementRows.map((m) => ({
      id: m.id,
      movementType: m.movement_type,
      minutesDelta: m.minutes_delta,
      notes: m.notes,
      createdAt: m.created_at,
      createdByName: m.created_by_profile ? `${m.created_by_profile.first_name} ${m.created_by_profile.last_name}` : "—",
    }));
  }

  return {
    id: paymentRow.id,
    studentId: paymentRow.student_id,
    studentName: paymentRow.student ? `${paymentRow.student.first_name} ${paymentRow.student.last_name}` : "Estudiante",
    amount: paymentRow.amount,
    currency: paymentRow.currency,
    paymentMethod: paymentRow.payment_method,
    status: paymentRow.status,
    reference: paymentRow.reference,
    paidAt: paymentRow.paid_at,
    createdAt: paymentRow.created_at,
    package: pkg
      ? {
          id: pkg.id,
          packageLabel: pkg.package_label,
          totalMinutes: pkg.total_minutes,
          remainingMinutes,
          pricePaid: pkg.price_paid,
          purchasedAt: pkg.purchased_at,
          expiresAt: pkg.expires_at,
          status: pkg.status,
        }
      : null,
    ledger,
    hasProof,
  };
}
