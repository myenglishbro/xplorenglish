// Edge Function: admin-create-student
// Reemplaza POST /api/admin/students (Next Route Handler, eliminado en este slice). Mismo flujo
// exacto, portado a Deno: verificar el JWT real del caller -> confirmar profiles.role='admin' ->
// validar el body -> pre-check de DNI -> generar contraseña temporal (Web Crypto, CSPRNG) ->
// auth.admin.createUser() -> RPC admin_provision_student_profile() -> si el RPC falla,
// compensar con auth.admin.deleteUser() del usuario recién creado.
//
// Duplicación intencional y documentada: el schema de validación (createStudentSchema) y el
// generador de contraseña temporal (generateTempPassword) ya existen por triplicado en este
// proyecto -- Next (src/server/admin/students/validation.ts, src/lib/auth/tempPassword.ts), Vite
// (frontend-vite/src/server/admin/students/validation.ts) y ahora acá. No es posible importar
// directamente ninguno de esos archivos desde el runtime Deno de una Edge Function (bundlers y
// paths distintos); se replican las MISMAS reglas exactas con Zod (misma librería, misma versión
// mayor que usa Vite) en vez de reducir validaciones para evitar la duplicación.
//
// service_role SOLO vive en el cliente `adminClient`, construido más abajo con la key leída de
// Deno.env -- nunca se expone en la respuesta, en logs, ni llega al cliente que llama.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_VITE_ORIGIN") ?? "http://localhost:5173";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

// Web Crypto (crypto.getRandomValues), global en el runtime Deno de Supabase Edge Functions --
// equivalente CSPRNG de crypto.randomInt (Node) usado por lib/auth/tempPassword.ts (Next). Mismo
// rejection sampling que admin-reset-student-password para no introducir sesgo de módulo.
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

// Mismo alfabeto/longitud/estructura exacta que lib/auth/tempPassword.ts (Next).
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

// Mismas reglas EXACTAS que createStudentSchema (server/admin/students/validation.ts, Next y
// Vite) -- mismos mensajes, mismo orden de campos, mismo ACADEMIC_LEVELS (server/admin/users/types.ts).
const ACADEMIC_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);

const createStudentSchema = z.object({
  first_name: requiredText("El nombre"),
  last_name: requiredText("El apellido"),
  dni: requiredText("El DNI"),
  phone: requiredText("El teléfono"),
  email: z.string().trim().min(1, "El correo es obligatorio").email("Ingresa un correo válido"),
  program_id: z
    .number({ required_error: "Selecciona un programa", invalid_type_error: "Selecciona un programa" })
    .int()
    .positive("Selecciona un programa"),
  level: z.enum(ACADEMIC_LEVELS),
});

const PROVISION_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  INVALID_TARGET: "Ocurrió un error interno al crear el estudiante.",
  PROGRAM_NOT_FOUND: "El programa seleccionado no existe.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  // 1) Autenticación -- mismo criterio que authenticateBearer() (Next): auth.getUser(token) real,
  // nunca decodifica el JWT localmente.
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return json({ error: "Falta el header Authorization: Bearer <access_token>." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "Sesión inválida o expirada." }, 401);
  }
  const callerId = userData.user.id;

  // 2) Autorización admin -- mismo criterio que requireAdminBearer() (Next).
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

  // 3) Validación de input -- mismo schema, mismos mensajes, mismo formato de fieldErrors
  // (flatten().fieldErrors) que devolvía el Route Handler de Next.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo de la petición inválido (se esperaba JSON)." }, 400);
  }

  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Datos inválidos.", fieldErrors: parsed.error.flatten().fieldErrors }, 400);
  }
  const { first_name, last_name, dni, phone, email, program_id, level } = parsed.data;

  // 4) Pre-check de DNI -- solo UX (falla rápido antes de tocar Auth); la garantía real es el
  // unique_violation sobre profiles_dni_uidx, manejado dentro del RPC más abajo.
  const { data: existingDni, error: dniCheckError } = await userClient.from("profiles").select("id").eq("dni", dni).maybeSingle();
  if (dniCheckError) return json({ error: "No pudimos validar el DNI. Inténtalo de nuevo en unos minutos." }, 500);
  if (existingDni) return json({ error: "Este DNI ya está registrado en otro usuario.", fieldErrors: { dni: "Ya registrado." } }, 409);

  // 5) Contraseña temporal -- nunca se persiste, solo viaja en la respuesta HTTP de éxito.
  const tempPassword = generateTempPassword();

  // service_role SOLO acá, construido dentro de la función -- nunca sale de este scope.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 6) auth.admin.createUser() -- nunca escribe directo en auth.users vía SQL.
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name },
  });

  if (createError) {
    if (createError.code === "email_exists") {
      return json({ error: "Ya existe una cuenta con este correo.", fieldErrors: { email: "Ya registrado." } }, 409);
    }
    return json({ error: "No pudimos crear la cuenta de acceso. Inténtalo de nuevo en unos minutos." }, 500);
  }

  const targetId = createdUser.user.id;

  // 7) admin_provision_student_profile (RPC, SECURITY INVOKER, sin cambios) -- crea la fila real
  // en profiles con role='student'/status='active'/must_change_password=true fijos.
  const { error: provisionError } = await userClient.rpc("admin_provision_student_profile", {
    p_target_id: targetId,
    p_first_name: first_name,
    p_last_name: last_name,
    p_dni: dni,
    p_phone: phone,
    p_program_id: program_id,
    p_level: level,
  });

  if (provisionError) {
    // 8) Compensación -- el usuario de Auth recién creado NUNCA debe quedar sin su fila en
    // profiles. Caso A (rollback OK) vs Caso B (rollback también falla) se distinguen
    // explícitamente, igual que el Route Handler que reemplaza.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
    if (deleteError) {
      console.error(`[admin-create-student] compensación falló: no se pudo borrar auth.users ${targetId}.`, deleteError);
      return json(
        {
          error:
            "Ocurrió un error al crear el estudiante y no pudimos deshacer la cuenta de acceso que se había creado. No reintentes con el mismo correo: contacta a soporte técnico primero.",
        },
        500
      );
    }

    const code = provisionError.message.split(":")[0] ?? "";
    if (code === "DNI_ALREADY_REGISTERED") {
      return json({ error: "Este DNI ya está registrado en otro usuario.", fieldErrors: { dni: "Ya registrado." } }, 409);
    }
    return json({ error: PROVISION_ERROR_MESSAGES[code] ?? "No pudimos completar la creación del estudiante." }, 500);
  }

  return json({ profileId: targetId, email, tempPassword }, 201);
});
