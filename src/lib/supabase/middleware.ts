import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Único trabajo de esta función: refrescar el token de sesión (si expiró) y
 * propagar las cookies actualizadas en la respuesta. NO decide autorización:
 * no consulta `profiles`, no conoce roles, no reemplaza RLS. El guard real por
 * rol vive en el layout server-side de cada route group (fuera de este archivo).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getSession() -- NUNCA getUser() -- porque aquí SOLO hace falta mantener la cookie de sesión
  // fresca para UX (que el navegador no arrastre un access token vencido a la siguiente
  // request). getSession() dispara el MISMO refresh real (vía refresh token, un round-trip
  // legítimo) cuando el access token está vencido, y ese refresh se sigue propagando por el
  // mismo setAll() de arriba -- sin cambios en ese mecanismo -- pero, a diferencia de getUser(),
  // NO hace ningún round-trip de red cuando el token todavía es válido (la mayoría de las
  // navegaciones): lee/decodifica el JWT ya guardado sin re-validarlo contra el servidor.
  //
  // *** ESTO NO ES UNA DECISIÓN DE AUTORIZACIÓN. *** El resultado de getSession() aquí NUNCA se
  // lee, ni se compara con un rol, ni se expone a la request -- por diseño, igual que antes con
  // getUser(). Supabase advierte explícitamente "no confiar en getSession() para proteger
  // páginas/datos": esa advertencia es sobre usarla para AUTORIZAR, no sobre usarla para
  // refrescar una cookie. La única autoridad real sigue siendo requireProfile()/requireRole()
  // (auth.getUser(), verificado contra el servidor, sin excepción -- src/lib/auth/session.ts) y
  // las policies de RLS en cada query -- ninguna de las dos cambia con esto. Una cookie
  // manipulada "pasaría" este getSession() sin problema, y eso es aceptable: no se toma ninguna
  // decisión con ese resultado; el mismo usuario sería rechazado igual que hoy en cuanto
  // getAuthUser()/RLS lo evalúen de verdad.
  const __t0 = performance.now();
  await supabase.auth.getSession();
  console.log(`[perf] middleware -> auth.getSession(): ${(performance.now() - __t0).toFixed(1)}ms [${request.nextUrl.pathname}]`);

  return supabaseResponse;
}
