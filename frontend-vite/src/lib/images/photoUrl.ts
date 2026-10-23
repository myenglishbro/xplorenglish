/**
 * Normaliza la URL de una foto de perfil. Devuelve la URL lista para guardar/mostrar, o null si no
 * es válida. Solo https (la columna profiles.photo_url lo exige además en la DB).
 *
 * Los enlaces de "compartir" de Google Drive (drive.google.com/file/d/ID/view) abren una página, no
 * la imagen: se convierten a la miniatura directa (drive.google.com/thumbnail?id=ID), que funciona
 * si el archivo está compartido como "Cualquier persona con el enlace".
 */
export function normalizePhotoUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  if (url.hostname === "drive.google.com" || url.hostname === "www.drive.google.com") {
    const fileId = url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get("id");
    if (!fileId) return null;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400`;
  }

  const normalized = url.toString();
  return normalized.length <= 500 ? normalized : null;
}
