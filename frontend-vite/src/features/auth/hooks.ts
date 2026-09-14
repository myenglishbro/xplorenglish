import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { registerSchema, type RegisterInput } from "@/server/auth/validation";

export type RegisterFieldErrors = Partial<Record<keyof RegisterInput, string>>;

export interface RegisterResult {
  /** Siempre true en el camino esperado: el proyecto tiene "Confirm email" deshabilitado, así que
   * signUp() devuelve sesión de una vez -- AuthProvider la toma vía onAuthStateChange y completa
   * el profile solo (ver completeSelfRegistrationIfPending). false solo puede pasar si alguien
   * reactiva la confirmación de correo en Supabase sin actualizar este flujo; RegisterPage lo trata
   * como error, no como un paso normal (no hay pantalla de "revisa tu correo"). */
  hasSession: boolean;
}

/**
 * Autorregistro público -- signUp() del lado del cliente (nunca service_role, nunca browser-direct
 * a auth.admin.*). Los datos personales (first_name/last_name/dni/phone/program_id) viajan como
 * user_metadata, marcados con registration_source='self' para que AuthProvider sepa que le
 * corresponde llamar a complete_registration() (0011) -- y para no confundirse con el
 * user_metadata.first_name que admin-create-student también setea (ver AuthProvider).
 * complete_registration es quien realmente crea la fila en profiles (role='student',
 * status='active', level='A1' por DEFAULT de columna), nunca este hook.
 *
 * Sin emailRedirectTo a propósito: con "Confirm email" deshabilitado no hay correo de
 * confirmación que redirigir, y sin ese fallback si alguien reactivara la confirmación el usuario
 * simplemente no tendría a dónde volver -- preferible que ese caso falle de forma visible
 * (ver el manejo de hasSession=false en RegisterPage) a que dependamos de una URL de retorno para
 * un flujo que ya no existe.
 */
export function useRegisterStudent() {
  return useMutation({
    mutationFn: async (input: RegisterInput): Promise<RegisterResult> => {
      const parsed = registerSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: RegisterFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof RegisterFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: RegisterFieldErrors };
      }

      const { email, password, first_name, last_name, dni, phone, program_id } = parsed.data;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            registration_source: "self",
            first_name,
            last_name,
            dni,
            phone,
            program_id,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.code === "user_already_exists") {
          throw { fieldErrors: { email: "Ya existe una cuenta con este correo." } } as { fieldErrors: RegisterFieldErrors };
        }
        if (error.status === 429 || error.code === "over_email_send_rate_limit") {
          throw new Error("Demasiados intentos en poco tiempo. Espera un minuto e inténtalo de nuevo.");
        }
        throw new Error("No pudimos crear tu cuenta. Verifica los datos e inténtalo de nuevo.");
      }

      // Con "Confirm email" deshabilitado, un correo ya registrado responde con identities vacío
      // en vez de un `error` (Supabase evita así filtrar qué correos existen).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw { fieldErrors: { email: "Ya existe una cuenta con este correo." } } as { fieldErrors: RegisterFieldErrors };
      }

      return { hasSession: !!data.session };
    },
  });
}
