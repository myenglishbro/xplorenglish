import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createStudentSchema, type CreateStudentInput } from "@/server/admin/students/validation";

export type CreateStudentFieldErrors = Partial<Record<keyof CreateStudentInput, string>>;

export interface CreateStudentResult {
  profileId: string;
  email: string;
  tempPassword: string;
}

interface CreateStudentErrorBody {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_MESSAGE = "No pudimos crear el estudiante. Inténtalo de nuevo en unos minutos.";

/**
 * Auditoría 2026-09-15 (bug en producción): esta función perdía por completo el error real en
 * dos casos -- (1) cualquier fallo que no fuera FunctionsHttpError (FunctionsFetchError/
 * FunctionsRelayError, p. ej. un fallo de red/CORS/relay que ni siquiera llega a
 * admin-create-student) caía directo al mensaje genérico sin mirar `error.message`/`error.context`;
 * (2) si el cuerpo de una FunctionsHttpError no era JSON parseable, también caía al genérico sin
 * conservar el texto crudo ni el status code. En ambos casos no quedaba rastro ni en consola --
 * un admin viendo el genérico no tenía ninguna pista real para reportar. `console.error` acá es
 * la fuente de verdad completa (DevTools); el mensaje devuelto a la UI ahora siempre incluye algo
 * accionable (status/texto crudo/detalle de red) en vez de únicamente el genérico.
 */
async function parseCreateStudentError(error: unknown): Promise<{ message: string; fieldErrors?: CreateStudentFieldErrors }> {
  console.error("[useCreateStudent] admin-create-student falló", error);

  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    try {
      const body = (await error.context.clone().json()) as CreateStudentErrorBody;
      if (typeof body.error === "string") {
        return { message: body.error, fieldErrors: body.fieldErrors as CreateStudentFieldErrors | undefined };
      }
    } catch {
      // cuerpo no era JSON parseable -- se intenta texto crudo abajo antes de caer al genérico
    }
    let bodyText = "";
    try {
      bodyText = (await error.context.clone().text()).trim().slice(0, 300);
    } catch {
      // sin cuerpo legible -- se informa solo el status
    }
    return { message: bodyText ? `Error del servidor (${status}): ${bodyText}` : `${GENERIC_MESSAGE} (código ${status})` };
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    // error.message de supabase-js es fijo ("Failed to send a request..."/"Relay Error...");
    // el detalle real (p. ej. "TypeError: Failed to fetch", o el motivo de un bloqueo CORS) vive
    // en error.context, que antes nunca se miraba.
    const detail = error.context instanceof Error ? error.context.message : undefined;
    return {
      message: detail
        ? `No pudimos conectar con el servidor (${detail}). Verifica tu conexión e inténtalo de nuevo.`
        : `No pudimos conectar con el servidor (${error.message}). Verifica tu conexión e inténtalo de nuevo.`,
    };
  }

  return { message: GENERIC_MESSAGE };
}

/**
 * Edge Function (admin-create-student) -- requiere auth.admin.createUser() (service_role), nunca
 * puede ir browser-direct. Reemplaza el Route Handler de Next (eliminado). Mismo flujo exacto del
 * lado del servidor: DNI pre-check + auth.admin.createUser() + RPC admin_provision_student_profile()
 * + compensación (deleteUser) si el RPC falla -- todo eso vive en la Edge Function, este hook solo
 * la invoca.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentInput): Promise<CreateStudentResult> => {
      const parsed = createStudentSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: CreateStudentFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof CreateStudentFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: CreateStudentFieldErrors };
      }

      const { data, error } = await supabase.functions.invoke<CreateStudentResult>("admin-create-student", {
        body: parsed.data,
      });

      if (error) {
        const { message, fieldErrors } = await parseCreateStudentError(error);
        if (fieldErrors) throw { fieldErrors } as { fieldErrors: CreateStudentFieldErrors };
        throw new Error(message);
      }
      if (!data?.profileId) {
        throw new Error("No pudimos crear el estudiante. Inténtalo de nuevo en unos minutos.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
