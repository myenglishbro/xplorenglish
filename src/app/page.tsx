import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { ROLE_HOME_PATH } from "@/lib/auth/roles";

// Dispatcher real de "/": requireProfile() ya cubre "no autenticado -> /login" y
// "autenticado sin perfil -> /complete-profile" (mismo guard que usan los layouts por
// rol, sin duplicar la lógica). Con perfil, siempre se redirige a su ROLE_HOME_PATH --
// nada se renderiza aquí.
export default async function HomePage() {
  console.log("[perf][HomePage] -> requireProfile");
  const profile = await requireProfile();
  redirect(ROLE_HOME_PATH[profile.role]);
}
