import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "speaking-recordings";

type Client = SupabaseClient<Database>;

/** Extensión según el tipo que produjo MediaRecorder (Chrome/Firefox: webm/ogg, Safari: mp4). */
function extensionFor(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/**
 * Path fijo por convención (0048): <classroom_id>/<activity_id>/<student_id>/<uuid>.<ext>. Los tres
 * primeros segmentos los arma la app desde el contexto real; la policy de Storage revalida que el
 * estudiante pertenezca al salón y que la actividad sea un speaking de ese salón. Cada intento usa
 * un nombre nuevo (sin upsert: el estudiante no puede sobreescribir ni borrar audios).
 */
export async function uploadRecording(
  supabase: Client,
  ctx: { classroomId: number; activityId: number; studentId: string },
  blob: Blob
): Promise<{ path: string } | { error: string }> {
  // El bucket valida el MIME exacto: se descarta el sufijo "; codecs=opus" que agrega MediaRecorder.
  const contentType = (blob.type || "audio/webm").split(";")[0] ?? "audio/webm";
  const path = `${ctx.classroomId}/${ctx.activityId}/${ctx.studentId}/${crypto.randomUUID()}.${extensionFor(contentType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false });
  if (error) return { error: "No pudimos subir tu grabación. Inténtalo de nuevo en unos minutos." };
  return { path };
}

/** URL firmada de corta vida para reproducir un audio con <audio>. RLS de Storage decide quién puede. */
export async function getRecordingUrl(supabase: Client, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Borra archivos de Storage (la API es la única forma soportada; no se puede DELETE sobre storage.objects). */
export async function removeRecordings(supabase: Client, paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  return !error;
}
