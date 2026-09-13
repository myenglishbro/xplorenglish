"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createHourPackageSchema } from "./validation";
import type { CreateHourPackageResult, PaymentsActionState } from "./types";

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** `'CODIGO: mensaje'` -- misma convención uniforme de los 12 RPC de dominio (0009). */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para registrar pagos.",
  INVALID_IDEMPOTENCY_KEY: "Falta la clave de idempotencia. Vuelve a intentarlo.",
  STUDENT_NOT_FOUND: "Ese estudiante no existe o no está activo.",
  INVALID_AMOUNT: "Revisa los minutos y el precio ingresados.",
};

function parseRpcError(error: { message: string }): string {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return RPC_ERROR_MESSAGES[code] ?? "No pudimos registrar el pago. Inténtalo de nuevo en unos minutos.";
}

/**
 * Único punto de escritura de este dominio: envuelve create_hour_package (0009) tal cual, sin
 * ningún INSERT directo a student_payments/hours_packages/hours_movements. `idempotencyKey`
 * viene del cliente (generado UNA vez por intención de compra, ver CreateHourPackageButton) --
 * esta acción nunca genera uno propio, solo lo reenvía al RPC.
 */
export async function createHourPackageAction(formData: FormData): Promise<PaymentsActionState<CreateHourPackageResult>> {
  await requireRole("admin");

  const parsed = createHourPackageSchema.safeParse({
    studentId: formData.get("studentId"),
    packageLabel: formData.get("packageLabel"),
    totalMinutes: formData.get("totalMinutes"),
    price: formData.get("price"),
    paymentMethod: formData.get("paymentMethod"),
    currency: formData.get("currency") ?? "",
    paymentReference: formData.get("paymentReference") ?? "",
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_hour_package", {
    p_student_id: parsed.data.studentId,
    p_package_label: parsed.data.packageLabel,
    p_total_minutes: parsed.data.totalMinutes,
    p_price: parsed.data.price,
    p_payment_method: parsed.data.paymentMethod,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_currency: parsed.data.currency || undefined,
    p_payment_reference: parsed.data.paymentReference || undefined,
  });

  if (error) return { error: parseRpcError(error) };

  const row = data?.[0];
  if (!row) return { error: "No pudimos registrar el pago. Inténtalo de nuevo en unos minutos." };

  revalidatePath("/admin/pagos-estudiantes");

  return { data: { paymentId: row.payment_id, packageId: row.package_id, movementId: row.movement_id } };
}
