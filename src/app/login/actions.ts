"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/auth/validation";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(formData: FormData): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Ingresa un correo y una contraseña válidos." };
  }

  const supabase = createClient();
  const __t0 = performance.now();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
  console.log(`[perf] loginAction -> signInWithPassword: ${(performance.now() - __t0).toFixed(1)}ms`);

  if (signInError) {
    // Mensaje genérico a propósito: nunca distinguir "no existe esa cuenta" de
    // "contraseña incorrecta" (evita enumeración de usuarios).
    return { error: "Correo o contraseña incorrectos." };
  }

  // signInWithPassword() ya devuelve el user autenticado en su propia respuesta -- es la
  // respuesta autoritativa del servidor de Auth para el login que se acaba de completar, no
  // un dato client-supplied ni derivado de JWT local. Un auth.getUser() adicional aquí sería
  // una segunda verificación redundante contra el mismo servidor que ya acaba de confirmar
  // esta identidad (medido: ~312ms desperdiciados en este segundo round-trip).
  const user = signInData.user;

  if (!user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  // Rol/autorización nunca sale de aquí ni de user_metadata: solo se usa la
  // existencia de la fila en profiles para decidir el destino.
  const __t2 = performance.now();
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  console.log(`[perf] loginAction -> profiles select: ${(performance.now() - __t2).toFixed(1)}ms`);
  console.log(`[perf] loginAction TOTAL (sin redirect): ${(performance.now() - __t0).toFixed(1)}ms`);

  // Redirect temporal a "/" hasta que existan las rutas por rol.
  redirect(profile ? "/" : "/complete-profile");
}
