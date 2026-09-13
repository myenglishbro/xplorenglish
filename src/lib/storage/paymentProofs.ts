import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "student-payment-proofs";

/**
 * Path fijo por convención (0010): student-payment-proofs/<student_id>/<payment_id>/comprobante
 * -- SIN sufijo de archivo ni timestamp, a propósito: un pago tiene como mucho un comprobante
 * vigente, así que "reemplazar" es simplemente volver a subir al mismo path con `upsert: true`
 * (sobreescribe el objeto existente). La extensión no importa para el renderizado -- el
 * `contentType` real se guarda como metadata del objeto vía la opción `contentType` del upload,
 * independiente del nombre. Igual criterio de seguridad que `lib/storage/materials.ts` (retirado
 * de contenido académico, no reusado acá): el prefijo lo arma la app a partir del contexto real
 * (studentId/paymentId ya conocidos por el caller, nunca texto libre del usuario), y la policy de
 * Storage (`student_payment_proofs_*`, 0010) revalida esa relación contra las tablas reales
 * sin importar qué intente el cliente.
 */
function buildPaymentProofPath(studentId: string, paymentId: number): string {
  return `${studentId}/${paymentId}/comprobante`;
}

export async function uploadPaymentProof(
  supabase: SupabaseClient<Database>,
  studentId: string,
  paymentId: number,
  file: File
): Promise<{ path: string } | { error: string }> {
  const path = buildPaymentProofPath(studentId, paymentId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    return { error: "No pudimos subir el comprobante. Inténtalo de nuevo en unos minutos." };
  }

  return { path };
}

/** Descarga directa navegador->Storage con la sesión del usuario -- RLS
 * (student_payment_proofs_select_own, 0010) es la única autoridad, sin URL firmada. Abre en una
 * pestaña nueva (PDFs/imágenes se renderizan inline) en vez de forzar una descarga. */
export async function viewPaymentProof(
  supabase: SupabaseClient<Database>,
  studentId: string,
  paymentId: number
): Promise<{ error?: string }> {
  const path = buildPaymentProofPath(studentId, paymentId);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return { error: "No pudimos abrir el comprobante. Inténtalo de nuevo en unos minutos." };
  }

  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return {};
}

/** Existencia del comprobante -- se usa server-side (Server Component, mismo cliente autenticado)
 * para decidir si mostrar "Sin comprobante todavía" o el botón "Ver/Descargar". `list()` con el
 * prefijo exacto es más barato que intentar un `download()` completo solo para chequear. */
export async function paymentProofExists(supabase: SupabaseClient<Database>, studentId: string, paymentId: number): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET).list(`${studentId}/${paymentId}`);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
