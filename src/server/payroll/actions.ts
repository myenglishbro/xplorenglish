"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createPayrollPeriodSchema, type CreatePayrollPeriodInput } from "./validation";

export type CreatePayrollPeriodFieldErrors = Partial<Record<keyof CreatePayrollPeriodInput, string>>;
export type PayrollActionState = { error?: string; fieldErrors?: CreatePayrollPeriodFieldErrors };

/** `'CODIGO: mensaje'` -- misma convención uniforme de los RPC de dominio (0009) ya traducida en
 * server/admin/users/actions.ts y server/scheduling/actions.ts; solo se traduce el código a un
 * mensaje amigable, nunca se muestra el mensaje crudo de Postgres. */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  INVALID_DATE_RANGE: "La fecha de fin debe ser mayor o igual a la de inicio.",
  TEACHER_NOT_FOUND: "Ese docente no existe o no está activo.",
  NO_ELIGIBLE_HOURS: "Este docente no tiene horas dictadas sin periodo asignado en ese rango de fechas.",
  PERIOD_NOT_FOUND: "El periodo no existe.",
  ALREADY_PAID: "Este periodo ya fue pagado.",
  MISSING_RECEIPT: "El periodo todavía no tiene un recibo subido -- no se puede aprobar.",
  NOT_APPROVED: "El periodo debe estar aprobado antes de marcarlo como pagado.",
  PERIOD_ALREADY_REVIEWED: "Este periodo ya fue aprobado o pagado -- ya no se puede subir ni reemplazar el recibo.",
  INVALID_FILE_PATH: "La ruta del archivo no es válida.",
};

function messageFor(error: { message: string }): string {
  const code = error.message.split(":")[0] ?? "";
  return RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.";
}

/**
 * Las 3 acciones de este archivo son envoltorios angostos sobre los RPC de dominio ya existentes
 * (0009) -- create_teacher_payment_period / approve_teacher_payment_period /
 * mark_teacher_payment_period_paid. Ninguna hace INSERT/UPDATE directo sobre
 * teacher_payment_periods: esos RPC son la única autoridad de las transiciones de estado
 * (idempotencia, elegibilidad de horas, validación de recibo) -- reimplementar esa lógica acá
 * duplicaría reglas de negocio que ya viven, probadas, en la base.
 */
export async function createPayrollPeriodAction(formData: FormData): Promise<PayrollActionState> {
  await requireRole("admin");

  const parsed = createPayrollPeriodSchema.safeParse({
    teacherId: formData.get("teacherId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
  });

  if (!parsed.success) {
    const fieldErrors: CreatePayrollPeriodFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof CreatePayrollPeriodFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("create_teacher_payment_period", {
    p_teacher_id: parsed.data.teacherId,
    p_period_start: parsed.data.periodStart,
    p_period_end: parsed.data.periodEnd,
  });

  if (error) return { error: messageFor(error) };

  revalidatePath("/admin/pagos-docentes");
  return {};
}

export async function approvePayrollPeriodAction(periodId: number): Promise<PayrollActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.rpc("approve_teacher_payment_period", { p_teacher_payment_period_id: periodId });
  if (error) return { error: messageFor(error) };

  revalidatePath("/admin/pagos-docentes");
  revalidatePath(`/admin/pagos-docentes/${periodId}`);
  return {};
}

export async function markPayrollPeriodPaidAction(periodId: number): Promise<PayrollActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.rpc("mark_teacher_payment_period_paid", { p_teacher_payment_period_id: periodId });
  if (error) return { error: messageFor(error) };

  revalidatePath("/admin/pagos-docentes");
  revalidatePath(`/admin/pagos-docentes/${periodId}`);
  return {};
}

/**
 * El propio docente registra un recibo que YA subió a Storage (uploadTeacherReceiptFile,
 * lib/storage/teacherReceipts.ts) -- esta acción nunca toca teacher_receipts directamente, solo
 * llama a upload_teacher_receipt (0009), que hace el upsert real y decide si corresponde mover
 * el periodo a 'receipt_uploaded'. requireRole("teacher") deriva el caller de la sesión; la
 * propiedad del periodo (¿es realmente SU periodo?) y el status editable los valida el RPC
 * mismo (NOT_AUTHORIZED / PERIOD_ALREADY_REVIEWED) -- no se duplica esa lógica acá, mismo
 * criterio que approvePayrollPeriodAction/markPayrollPeriodPaidAction ya usan.
 */
export async function registerTeacherReceiptAction(periodId: number, filePath: string): Promise<PayrollActionState> {
  await requireRole("teacher");

  const supabase = createClient();
  const { error } = await supabase.rpc("upload_teacher_receipt", {
    p_teacher_payment_period_id: periodId,
    p_file_path: filePath,
  });

  if (error) return { error: messageFor(error) };

  revalidatePath("/teacher/pagos");
  revalidatePath(`/teacher/pagos/${periodId}`);
  return {};
}
