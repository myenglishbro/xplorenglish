import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "materials";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Path fijo por convención (0010): materials/<classroom_id>/<lesson_id>/<filename>. El prefijo
 * classroom_id/lesson_id lo calcula la app a partir del contexto real de la página -- nunca algo
 * que el usuario escriba -- así que aunque el archivo se sube directo navegador->Storage (sin
 * pasar por el servidor), no hay forma de apuntar a la carpeta de otro salón: la policy de
 * Storage (materials_teacher_admin_write, 0010) recalcula esa relación contra las tablas reales y
 * rechaza cualquier path que no le corresponda al caller, sin importar qué intente el cliente.
 */
function buildMaterialPath(classroomId: number, lessonId: number, fileName: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${classroomId}/${lessonId}/${unique}-${sanitizeFileName(fileName)}`;
}

export async function uploadMaterial(
  supabase: SupabaseClient<Database>,
  classroomId: number,
  lessonId: number,
  file: File
): Promise<{ path: string } | { error: string }> {
  const path = buildMaterialPath(classroomId, lessonId, file.name);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });

  if (error) {
    return { error: "No pudimos subir el archivo. Inténtalo de nuevo en unos minutos." };
  }

  return { path };
}

/** Descarga directa navegador->Storage con la sesión del usuario -- RLS (materials_select, 0010)
 * es la única autoridad; no hace falta generar una URL firmada. */
export async function downloadMaterial(
  supabase: SupabaseClient<Database>,
  path: string,
  downloadName: string
): Promise<{ error?: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return { error: "No pudimos descargar el archivo. Inténtalo de nuevo en unos minutos." };
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return {};
}

export async function removeMaterials(supabase: SupabaseClient<Database>, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  // Best-effort: un archivo huérfano sin fila que lo referencie es inofensivo (nadie puede
  // listarlo/adivinarlo sin la fila) -- no se oculta el fallo (queda en consola), pero tampoco
  // bloquea el borrado real (la fila de `resources`/`lessons`/`modules`), que ya tuvo éxito.
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.error("[removeMaterials] no se pudieron borrar objetos de Storage:", paths, error);
  }
}
