// Edge Function: admin-reset-student-password
// Reemplaza POST /api/admin/users/:id/reset-password (Next Route Handler, eliminado en este
// slice). Mismo flujo exacto, portado a Deno: verificar el JWT real del caller -> confirmar
// profiles.role='admin' -> validar el target (existe, es student) -> generar contraseña temporal
// (Web Crypto, CSPRNG) -> auth.admin.updateUserById() (service_role, SOLO dentro de esta función)
// -> RPC admin_reset_student_password_flag() para volver a marcar must_change_password=true.
//
// El orden importa y se preserva tal cual: Auth se actualiza PRIMERO; si el RPC posterior falla,
// la contraseña YA cambió -- no se intenta ninguna pseudo-transacción entre Auth y Postgres (no
// existe tal cosa). Esa combinación (password cambiado + flag sin marcar) se reporta con HTTP 207
// y { error, tempPassword } en el cuerpo, exactamente como hacía el Route Handler que reemplaza.
//
// service_role SOLO vive en el cliente `adminClient`, construido más abajo con la key leída de
// Deno.env -- nunca se expone en la respuesta, en logs, ni llega al cliente que llama.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Allowlist explícita -- NUNCA "*". Mismo criterio que admin-create-student (ver ese archivo para
// el razonamiento completo): FRONTEND_VITE_ORIGIN cubre producción (configurable vía
// `supabase secrets set`, sin redeploy); los dos puertos de Vite en dev están fijos en código.
const ALLOWED_ORIGINS = new Set(
  [Deno.env.get("FRONTEND_VITE_ORIGIN") ?? "https://xplore-english.vercel.app", "http://localhost:5173", "http://localhost:5174"]
);

// Lista canónica de @supabase/supabase-js/cors (SUPABASE_HEADERS) -- ver admin-create-student
// para el bug real que esto corrige (X-Client-Info, que el SDK agrega siempre, no estaba
// permitido y hacía fallar el preflight con "Failed to fetch" en cualquier llamada real).
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage";

function corsHeaders(requestOrigin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  };
  // Refleja EXACTAMENTE el origin recibido solo si está en la allowlist -- nunca un valor fijo ni
  // un wildcard. Sin este header, el navegador descarta la respuesta aunque el body/status estén
  // bien formados: es la única puerta real de rechazo para un origin no autorizado.
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }
  return headers;
}

function jsonWithOrigin(body: unknown, status: number, requestOrigin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(requestOrigin) },
  });
}

// Web Crypto (crypto.getRandomValues), disponible como global en el runtime de Deno de Supabase
// Edge Functions -- equivalente CSPRNG de crypto.randomInt (Node) usado por el lib/auth/tempPassword.ts
// original. Rejection sampling contra 0xffffffff para no introducir sesgo de módulo.
function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive debe ser un entero positivo");
  }
  const MAX_UINT32 = 0xffffffff;
  const limit = MAX_UINT32 - (MAX_UINT32 % maxExclusive);
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % maxExclusive;
}

// Mismo alfabeto/longitud/estructura exacta que lib/auth/tempPassword.ts (Next) -- sin caracteres
// ambiguos (0/O, 1/l/I), 20 caracteres, al menos uno de cada clase, Fisher-Yates con CSPRNG.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;
const LENGTH = 20;

function pick(charset: string): string {
  return charset[randomInt(charset.length)] as string;
}

function generateTempPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: LENGTH - required.length }, () => pick(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }

  return chars.join("");
}

Deno.serve(async (req: Request) => {
  // Se lee UNA vez y se captura en `json` (closure) para el resto del handler -- ver
  // admin-create-student para el mismo patrón.
  const requestOrigin = req.headers.get("Origin") ?? req.headers.get("origin");
  const json = (body: unknown, status: number) => jsonWithOrigin(body, status, requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return json({ error: "Falta el header Authorization: Bearer <access_token>." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente "as user" -- anon key + el Bearer del caller como header global. auth.getUser(token)
  // lo verifica REALMENTE contra el servidor de Supabase Auth (nunca decodifica el JWT
  // localmente) -- mismo criterio exacto que authenticateBearer() (Next). RLS sigue siendo la
  // autoridad real sobre cualquier query hecha con este cliente.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "Sesión inválida o expirada." }, 401);
  }
  const callerId = userData.user.id;

  // Autorización admin -- mismo criterio que requireAdminBearer() (Next): profiles.role del
  // usuario YA autenticado, nunca algo que el cliente mande.
  const { data: callerProfile, error: callerProfileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (callerProfileError || !callerProfile) {
    return json({ error: "No pudimos verificar tu perfil." }, 403);
  }
  if (callerProfile.role !== "admin") {
    return json({ error: "Esta operación es exclusiva para administradores." }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo de la petición inválido (se esperaba JSON)." }, 400);
  }
  const targetId = body && typeof body === "object" ? (body as Record<string, unknown>).targetId : undefined;
  if (typeof targetId !== "string" || targetId.length === 0) {
    return json({ error: "Falta targetId." }, 400);
  }

  const { data: target, error: targetError } = await userClient.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (targetError || !target) {
    return json({ error: "El perfil no existe." }, 404);
  }
  if (target.role !== "student") {
    return json({ error: "Esta acción solo aplica a estudiantes." }, 400);
  }

  const tempPassword = generateTempPassword();

  // service_role SOLO acá, construido dentro de la función -- nunca sale de este scope.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetId, { password: tempPassword });
  if (updateAuthError) {
    return json({ error: "No pudimos cambiar la contraseña. Inténtalo de nuevo en unos minutos." }, 500);
  }

  // Mismo cliente "as user" que hizo el chequeo de admin arriba -- la RPC es SECURITY INVOKER y
  // vuelve a validar todo por su cuenta (auth.uid(), rol admin, target existe, target es student).
  const { error: flagError } = await userClient.rpc("admin_reset_student_password_flag", { p_target_id: targetId });
  if (flagError) {
    console.error(`[admin-reset-student-password] contraseña de Auth cambió para ${targetId}, pero el flag RPC falló.`, flagError);
    return json(
      {
        error: "La contraseña se cambió, pero no pudimos marcarla como temporal. Entrégala igual y reintenta esta acción en unos minutos.",
        tempPassword,
      },
      207
    );
  }

  return json({ tempPassword }, 200);
});
