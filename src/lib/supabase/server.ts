import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Usa getAll()/setAll() (patrón actual de @supabase/ssr) contra cookies() de
 * next/headers -- no get/set/remove individuales, que son la API deprecada.
 *
 * setAll puede fallar si se llama desde un Server Component puro (no puede escribir
 * cookies durante el render); se ignora ese error porque el middleware ya se encarga
 * de refrescar y propagar la sesión en cada request.
 */
export function createClient() {
  // Next.js 14: cookies() es síncrono (en Next 15 pasó a ser async). No se usa
  // `await` aquí para no asumir un comportamiento que esta versión no tiene.
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Llamado desde un Server Component: no se puede escribir. El middleware
            // ya refresca la sesión en cada request, así que es seguro ignorarlo aquí.
          }
        },
      },
    }
  );
}
