"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/auth/validation";
import { getOrigin } from "@/lib/url";

export type RegisterFieldErrors = Partial<
  Record<"email" | "password" | "first_name" | "last_name" | "dni" | "phone", string>
>;

export type RegisterActionState = {
  error?: string;
  fieldErrors?: RegisterFieldErrors;
};

export async function registerAction(formData: FormData): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dni: formData.get("dni"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: RegisterFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof RegisterFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password, first_name, last_name, dni, phone } = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Transporte temporal: solo datos personales, nunca role/level/status.
      // complete_registration() los lee de aquí en /auth/callback o /complete-profile.
      data: { first_name, last_name, dni, phone },
      emailRedirectTo: `${getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: "No pudimos crear tu cuenta. Verifica los datos e inténtalo de nuevo." };
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}
