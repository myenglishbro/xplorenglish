import { headers } from "next/headers";

/**
 * Origen del request actual (http en localhost, https en cualquier otro host) -- usado para
 * construir redirectTo/emailRedirectTo de Auth sin hardcodear el dominio.
 */
export function getOrigin(): string {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${host}`;
}
