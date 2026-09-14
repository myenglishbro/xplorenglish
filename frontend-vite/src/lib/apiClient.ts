import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL no configurada (.env.local) -- necesaria para el Route Handler seguro.");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Llama a un Route Handler seguro del Next.js viejo (mutaciones que no pueden ir browser-direct
 * todavía -- ver features/availability/api.ts). Adjunta el access_token real de la sesión actual
 * como Bearer; el Route Handler lo usa para construir su propio cliente Supabase "as user" y deja
 * que RLS + requireActiveTeacherId() decidan, nunca confía en nada que mande este cliente aparte
 * del token.
 */
export async function secureApiCall<T>(path: string, options: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown }): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError("No hay sesión activa.", 401, "NO_SESSION");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // respuesta sin cuerpo (ej. 204) -- válido para DELETE
  }

  if (!res.ok) {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const message = typeof body.error === "string" ? body.error : `Error ${res.status}`;
    const fieldErrors = body.fieldErrors && typeof body.fieldErrors === "object" ? (body.fieldErrors as Record<string, string>) : undefined;
    throw new ApiError(message, res.status, undefined, fieldErrors);
  }

  return payload as T;
}
