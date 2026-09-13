import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Excluye: _next/static, _next/image, favicon.ico, extensiones de imagen/archivo estático
    // comunes (+ json/txt/xml/webmanifest), y cualquier path bajo .well-known/ (probes técnicos
    // de navegador/herramientas -- ej. Chrome DevTools pidiendo
    // .well-known/appspecific/com.chrome.devtools.json -- nunca una ruta real de esta app;
    // verificado que no existe ningún robots.ts/sitemap.ts/manifest.ts ni archivo con esas
    // extensiones bajo src/app). Corre en todo lo demás, incluidas todas las rutas navegables
    // reales de la app y los Server Actions.
    "/((?!_next/static|_next/image|favicon\\.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|json|txt|xml|webmanifest)$).*)",
  ],
};
