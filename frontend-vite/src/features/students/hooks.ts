import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
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

async function parseCreateStudentError(error: unknown): Promise<{ message: string; fieldErrors?: CreateStudentFieldErrors }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as CreateStudentErrorBody;
      return {
        message: typeof body.error === "string" ? body.error : "No pudimos crear el estudiante. Inténtalo de nuevo en unos minutos.",
        fieldErrors: body.fieldErrors as CreateStudentFieldErrors | undefined,
      };
    } catch {
      // cuerpo no era JSON parseable -- se usa el mensaje genérico de abajo
    }
  }
  return { message: "No pudimos crear el estudiante. Inténtalo de nuevo en unos minutos." };
}

/**
 * Edge Function (admin-create-student) -- requiere auth.admin.createUser() (service_role), nunca
 * puede ir browser-direct. Reemplaza el Route Handler de Next (eliminado) -- ya no depende de
 * VITE_API_BASE_URL para esta operación. Mismo flujo exacto del lado del servidor: DNI pre-check +
 * auth.admin.createUser() + RPC admin_provision_student_profile() + compensación (deleteUser) si
 * el RPC falla -- todo eso vive en la Edge Function, este hook solo la invoca.
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
