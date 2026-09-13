import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace de confirmación de email (emailRedirectTo en signUp()).
 * Intercambia el código PKCE por una sesión real y, si corresponde, aprovisiona
 * el perfil (public.profiles) usando los datos guardados en user_metadata al
 * registrarse. Nunca lee ni decide "role" desde aquí -- eso lo define la base de
 * datos (default de columna + complete_registration()).
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Estado genérico y recuperable a propósito: no se inspecciona el error para
    // adivinar "otro dispositivo" vs "enlace vencido". Si el correo ya quedó
    // confirmado en GoTrue (eso ocurre en su propio endpoint /verify, ANTES de
    // este intercambio), el usuario simplemente inicia sesión normal y /login ya
    // sabe enrutar: con perfil -> su home; sin perfil -> /complete-profile.
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // Idempotencia a nivel de ruta: si ya existe perfil (ej. el usuario vuelve a
  // pasar por este callback -- correo abierto dos veces, o ya se completó antes),
  // no hace falta llamar de nuevo a la RPC; se redirige directo.
  const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();

  if (existingProfile) {
    return NextResponse.redirect(`${origin}/?welcome=1`);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
  const dni = typeof metadata.dni === "string" ? metadata.dni.trim() : "";
  const phone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";

  if (!firstName || !lastName || !dni || !phone) {
    // user_metadata incompleta/corrupta: no se intenta la RPC con datos vacíos.
    // /complete-profile es la red de seguridad universal para "authenticated sin
    // profile" -- prellenará lo que sí haya y dejará el resto editable.
    return NextResponse.redirect(`${origin}/complete-profile?error=missing_data`);
  }

  // program_id = null deliberado en este bloque: /register no lo recolecta (ver
  // nota de diseño -- programs solo es legible por "authenticated", no por "anon").
  const { error: rpcError } = await supabase.rpc("complete_registration", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_dni: dni,
    p_phone: phone,
  });

  if (rpcError) {
    if (rpcError.message.startsWith("DNI_ALREADY_REGISTERED")) {
      return NextResponse.redirect(`${origin}/complete-profile?error=dni_taken`);
    }
    console.error("complete_registration falló en /auth/callback:", rpcError);
    return NextResponse.redirect(`${origin}/complete-profile?error=unexpected`);
  }

  // Redirect temporal a "/" hasta que existan los route groups (admin)/(teacher)/(student).
  return NextResponse.redirect(`${origin}/?welcome=1`);
}
