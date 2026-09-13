"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeProfileSchema } from "@/lib/auth/validation";

export type CompleteProfileFieldErrors = Partial<Record<"first_name" | "last_name" | "dni" | "phone", string>>;

export type CompleteProfileActionState = {
  error?: string;
  fieldErrors?: CompleteProfileFieldErrors;
};

export async function completeProfileAction(formData: FormData): Promise<CompleteProfileActionState> {
  const parsed = completeProfileSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dni: formData.get("dni"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: CompleteProfileFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof CompleteProfileFieldErrors] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { first_name, last_name, dni, phone } = parsed.data;

  // program_id = null deliberado en este bloque (ver nota de diseño en /register).
  const { error } = await supabase.rpc("complete_registration", {
    p_first_name: first_name,
    p_last_name: last_name,
    p_dni: dni,
    p_phone: phone,
  });

  if (error) {
    if (error.message.startsWith("DNI_ALREADY_REGISTERED")) {
      return { fieldErrors: { dni: "Este DNI ya está registrado en otra cuenta." } };
    }
    return { error: "No pudimos completar tu perfil. Inténtalo de nuevo en unos minutos." };
  }

  // Redirect temporal a "/" hasta que existan las rutas por rol.
  redirect("/");
}
