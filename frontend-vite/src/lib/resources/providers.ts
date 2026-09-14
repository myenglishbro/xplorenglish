/**
 * Detección de proveedor a partir de una URL externa -- nunca a partir de HTML pegado por el
 * usuario. Se usa tanto en el servidor (única autoridad real: `type` en `resources` nunca se
 * confía si viene del cliente, se recalcula acá) como, opcionalmente, en el cliente para dar
 * feedback visual antes de guardar.
 *
 * Solo los 5 proveedores conocidos se auto-embeben (decisión de producto explícita). Cualquier
 * otra URL (incluyendo dominios que en teoría admiten iframe) queda como `type: "url"` -- no se
 * intenta adivinar embebibilidad genérica. Si en el futuro se necesita un proveedor nuevo
 * (Genially, Canva, Padlet, Quizlet...), se agrega aquí explícitamente.
 */

export type KnownProviderType = "youtube" | "vimeo" | "drive" | "docs" | "slides";

export interface DetectedProvider {
  type: KnownProviderType;
  embedUrl: string;
}

/** Nunca confiar en un string crudo como URL: valida esquema explícitamente. `javascript:`,
 * `data:`, `file:` y cualquier otro esquema peligroso quedan excluidos por no aparecer en la
 * allowlist -- no por un blocklist, que siempre es más fácil de eludir. */
export function safeParseUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const allowedProtocols = process.env.NODE_ENV === "production" ? ["https:"] : ["https:", "http:"];
  if (!allowedProtocols.includes(url.protocol)) return null;
  return url;
}

export function isValidResourceUrl(raw: string): boolean {
  return safeParseUrl(raw) !== null;
}

function hostnameIs(url: URL, ...hosts: string[]): boolean {
  const h = url.hostname.toLowerCase();
  return hosts.some((allowed) => h === allowed || h === `www.${allowed}`);
}

function matchYouTube(url: URL): string | null {
  if (hostnameIs(url, "youtu.be")) {
    const id = url.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (hostnameIs(url, "youtube.com", "m.youtube.com")) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }
    const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return shortsMatch[1] ?? null;
    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return embedMatch[1] ?? null;
    const liveMatch = url.pathname.match(/^\/live\/([^/]+)/);
    if (liveMatch) return liveMatch[1] ?? null;
  }
  return null;
}

function matchVimeo(url: URL): string | null {
  if (!hostnameIs(url, "vimeo.com", "player.vimeo.com")) return null;
  const match = url.pathname.match(/(\d+)(?:\/[a-zA-Z0-9]+)?\/?$/);
  return match ? (match[1] ?? null) : null;
}

function matchGoogleDrive(url: URL): string | null {
  if (!hostnameIs(url, "drive.google.com")) return null;
  const fileMatch = url.pathname.match(/^\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1] ?? null;
  if (url.pathname === "/open") {
    return url.searchParams.get("id");
  }
  return null;
}

function matchGoogleDocs(url: URL): string | null {
  if (!hostnameIs(url, "docs.google.com")) return null;
  const match = url.pathname.match(/^\/document\/d\/([^/]+)/);
  return match ? (match[1] ?? null) : null;
}

function matchGoogleSlides(url: URL): string | null {
  if (!hostnameIs(url, "docs.google.com")) return null;
  const match = url.pathname.match(/^\/presentation\/d\/([^/]+)/);
  return match ? (match[1] ?? null) : null;
}

/** Devuelve el proveedor conocido + la URL de embed que nuestra propia app construye, o `null` si
 * la URL no matchea ninguno de los 5 proveedores soportados -- en cuyo caso el caller debe tratar
 * el recurso como `type: "url"` (tarjeta + "Abrir recurso"), nunca como embed genérico. */
export function detectKnownProvider(raw: string): DetectedProvider | null {
  const url = safeParseUrl(raw);
  if (!url) return null;

  const ytId = matchYouTube(url);
  if (ytId) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytId}` };

  const vimeoId = matchVimeo(url);
  if (vimeoId) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoId}` };

  const driveId = matchGoogleDrive(url);
  if (driveId) return { type: "drive", embedUrl: `https://drive.google.com/file/d/${driveId}/preview` };

  const docsId = matchGoogleDocs(url);
  if (docsId) return { type: "docs", embedUrl: `https://docs.google.com/document/d/${docsId}/preview` };

  const slidesId = matchGoogleSlides(url);
  if (slidesId) return { type: "slides", embedUrl: `https://docs.google.com/presentation/d/${slidesId}/embed` };

  return null;
}
