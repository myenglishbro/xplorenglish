import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "teacher-receipts";

/**
 * Path fijo por convención (0009/0010): receipts/<teacher_id>/<teacher_payment_period_id>/comprobante
 * -- mismo criterio que buildPaymentProofPath en lib/storage/paymentProofs.ts: sin sufijo de
 * archivo ni timestamp, a propósito. teacher_receipts tiene unique(teacher_payment_period_id) y
 * upload_teacher_receipt (0009) ya hace upsert sobre esa unicidad, así que "reemplazar" es
 * simplemente volver a subir al mismo path con `upsert: true` (sobreescribe el objeto existente
 * en vez de dejar huérfanos). La extensión no importa para el renderizado -- el `contentType`
 * real se guarda como metadata del objeto vía la opción `contentType` del upload. El prefijo lo
 * arma la app a partir del contexto real (teacherId/periodId ya conocidos por el caller, nunca
 * texto libre del usuario), y la policy de Storage (`teacher_receipts_write_own`, 0010) revalida
 * esa relación contra can_manage_receipt sin importar qué intente el cliente.
 */
function buildReceiptPath(teacherId: string, periodId: number): string {
  return `receipts/${teacherId}/${periodId}/comprobante`;
}

/**
 * Sube el recibo directo navegador->Storage con la sesión del docente -- RLS
 * (teacher_receipts_write_own, vía can_manage_receipt) es la única autoridad de si este upload
 * procede (docente dueño del periodo, en un status editable, o admin). Devuelve el path para que
 * el caller lo pase tal cual a upload_teacher_receipt (RPC, 0009) -- esta función nunca toca
 * teacher_receipts directamente, solo Storage.
 */
export async function uploadTeacherReceiptFile(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  periodId: number,
  file: File
): Promise<{ path: string } | { error: string }> {
  const path = buildReceiptPath(teacherId, periodId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    return { error: "No pudimos subir el recibo. Inténtalo de nuevo en unos minutos." };
  }

  return { path };
}

/** Descarga directa navegador->Storage con la sesión del usuario -- RLS
 * (teacher_receipts_write_own, 0010, vía can_manage_receipt) es la única autoridad; el admin
 * pasa por el mismo camino (is_admin() dentro de can_manage_receipt), sin service role. Mismo
 * patrón que viewPaymentProof en lib/storage/paymentProofs.ts: abre en una pestaña nueva en vez
 * de forzar una descarga. `filePath` es la ruta completa ya guardada en teacher_receipts.file_path
 * (empieza con "receipts/<teacher_id>/<period_id>/"), no se reconstruye acá. */
export async function viewTeacherReceipt(supabase: SupabaseClient<Database>, filePath: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
  if (error || !data) {
    return { error: "No pudimos abrir el recibo. Inténtalo de nuevo en unos minutos." };
  }

  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return {};
}
