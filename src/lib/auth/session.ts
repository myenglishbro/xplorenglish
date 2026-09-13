import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { ROLE_HOME_PATH, type UserRole } from "@/lib/auth/roles";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// --- INSTRUMENTACIÓN TEMPORAL DE PERFORMANCE (auditoría en curso, remover al terminar) ---
// Contadores puramente diagnósticos (cuántas veces se EJECUTA de verdad el cuerpo de la
// función) -- no son caché ni participan en ninguna decisión de autorización.
let __getAuthUserCalls = 0;
let __getProfileByUserIdCalls = 0;
let __getCurrentProfileCalls = 0;
let __requireProfileCalls = 0;

// Stack trace real (no una etiqueta que yo adivino) del caller que disparó una EJECUCIÓN REAL
// (cache miss) -- filtra frames de node_modules/Next internals, se queda solo con las líneas de
// código de la app, para responder "quién generó esta llamada".
function __callerStack(): string {
  const stack = new Error().stack ?? "";
  return stack
    .split("\n")
    .slice(1) // descarta "Error" en sí
    .filter((line) => !line.includes("node_modules") && !line.includes(" (node:") && !line.trim().startsWith("at node:"))
    .slice(0, 6)
    .map((line) => line.trim())
    .join("\n    ");
}
// -------------------------------------------------------------------------------------------

/**
 * Usuario autenticado, validado contra el servidor de Supabase Auth.
 *
 * Usa auth.getUser(), NUNCA auth.getSession() para decisiones de autorización:
 * getSession() solo lee el JWT de la cookie sin verificarlo contra Supabase Auth,
 * así que no es una fuente confiable server-side (un JWT de una cookie manipulada
 * pasaría getSession() pero fallaría getUser()).
 *
 * Envuelta en cache() de React: dentro de un mismo render de Server Components, múltiples
 * llamadas a getAuthUser() reusan el mismo resultado ya verificado en vez de volver a golpear
 * la red -- pero siguen siendo auth.getUser() real, nunca datos derivados de JWT/metadata sin
 * verificar. cache() de React NO es una caché global: Next.js crea un scope nuevo por cada
 * request que entra al servidor, así que dos requests (del mismo usuario o de usuarios
 * distintos) nunca comparten este resultado.
 *
 * IMPORTANTE (demostrado con stack trace real): dentro de la ejecución de un Server Action,
 * cache() de React NO deduplica llamadas anidadas -- solo aporta dedup confiable dentro de un
 * render de Server Components. Por eso requireProfile() (más abajo) NUNCA debe depender de
 * cache() para evitar una segunda resolución de auth: debe resolver el user una sola vez y
 * pasar su id explícitamente, nunca volver a pedirlo.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  __getAuthUserCalls += 1;
  const __callN = __getAuthUserCalls;
  console.log(`[perf][getAuthUser#${__callN}] EJECUCIÓN REAL (cache miss) -- caller:\n    ${__callerStack()}`);
  const __t0 = performance.now();
  const { data, error } = await supabase.auth.getUser();
  console.log(`[perf] getAuthUser#${__callN} -> auth.getUser() [EJECUCIÓN REAL, no cache hit]: ${(performance.now() - __t0).toFixed(1)}ms`);
  if (error || !data.user) return null;
  return data.user;
});

/**
 * Fila de public.profiles para un userId YA VERIFICADO -- consulta exclusivamente `profiles`
 * por ese id, NUNCA llama a auth.getUser(). Existe separada de getCurrentProfile() precisamente
 * para que un caller que ya resolvió el user (ej. requireProfile()) pueda pedir su profile sin
 * volver a pagar una resolución de auth -- ni siquiera a través de cache(), que (ver nota en
 * getAuthUser()) no protege este caso dentro de un Server Action.
 */
export const getProfileByUserId = cache(async (userId: string): Promise<Profile | null> => {
  __getProfileByUserIdCalls += 1;
  const __callN = __getProfileByUserIdCalls;
  console.log(`[perf][getProfileByUserId#${__callN}] EJECUCIÓN REAL (cache miss) -- caller:\n    ${__callerStack()}`);

  const supabase = createClient();
  const __t0 = performance.now();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  console.log(`[perf] getProfileByUserId#${__callN} -> profiles select [EJECUCIÓN REAL, no cache hit]: ${(performance.now() - __t0).toFixed(1)}ms`);

  if (error) return null;
  return profile;
});

/**
 * Compone getAuthUser() + getProfileByUserId() para callers que quieren "el profile del usuario
 * actual" sin ya tener el user resuelto a mano (ej. páginas con guard propio y mínimo:
 * /login, /complete-profile, /change-password -- todas Server Components, donde cache() sí
 * deduplica correctamente el getAuthUser() interno contra el que esas páginas ya llamaron antes).
 *
 * requireProfile() NO usa esta función -- ver más abajo, por qué.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  __getCurrentProfileCalls += 1;
  const __callN = __getCurrentProfileCalls;
  console.log(`[perf][getCurrentProfile#${__callN}] -> getAuthUser`);

  const user = await getAuthUser();
  if (!user) return null;

  console.log(`[perf][getCurrentProfile#${__callN}] -> getProfileByUserId`);
  return getProfileByUserId(user.id);
});

/**
 * Guard compartido: exige sesión + perfil + contraseña definitiva, o redirige. Es la única
 * implementación de "no autenticado -> /login" / "autenticado sin perfil -> /complete-profile" /
 * "debe cambiar su contraseña temporal -> /change-password" -- la usan tanto el dispatcher de
 * "/" como cada layout por rol, para no duplicarla.
 *
 * /change-password NUNCA llama a este guard (tiene el suyo propio, mínimo, en su page.tsx) --
 * por eso este redirect no necesita saber "en qué ruta estoy" para evitar un loop.
 *
 * Deliberadamente llama a getProfileByUserId(user.id), NUNCA a getCurrentProfile(): ya tenemos
 * el user verificado en la línea anterior -- pedirlo nuevo por dentro de getCurrentProfile()
 * sería una segunda resolución de auth redundante, y (demostrado con stack trace real en la
 * auditoría de performance) cache() de React no la evita dentro de un Server Action. La única
 * garantía real de "auth.getUser() exactamente una vez" es esta: no volver a pedir lo que ya
 * tenemos.
 */
export async function requireProfile(): Promise<Profile> {
  __requireProfileCalls += 1;
  const __callN = __requireProfileCalls;
  const __t0 = performance.now();
  console.log(`[perf][requireProfile#${__callN}] -> getAuthUser`);

  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  console.log(`[perf][requireProfile#${__callN}] -> getProfileByUserId`);
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect("/complete-profile");
  }

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  console.log(
    `[perf] requireProfile#${__callN} TOTAL: ${(performance.now() - __t0).toFixed(1)}ms (getAuthUser+getProfileByUserId so far: ${__getAuthUserCalls} / ${__getProfileByUserIdCalls} calls in this process)`
  );
  return profile;
}

/**
 * Guard por rol: exige sesión + perfil (requireProfile) y además que el rol coincida.
 * Si no coincide, redirige a ROLE_HOME_PATH del rol real -- nunca a una página de
 * "prohibido": cada usuario siempre termina en su propio home.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  console.log(`[perf][requireRole(${role})] -> requireProfile`);
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(ROLE_HOME_PATH[profile.role]);
  }
  return profile;
}
