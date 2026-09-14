import "server-only";

/**
 * CORS restringido a un único origen explícito (el SPA Vite) -- nunca "*". Configurable por env
 * para poder apuntar a un dominio de producción sin tocar código; default al puerto de dev de
 * Vite para que funcione de inmediato en local.
 */
const ALLOWED_ORIGIN = process.env.FRONTEND_VITE_ORIGIN ?? "http://localhost:5173";

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
