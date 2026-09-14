import type { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** A dónde redirigir a cada rol tras login / al entrar a "/". */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/** Roles cuyas rutas ya viven en este SPA (Fase 2/3: teacher + student; Fase 4: admin). Cualquier
 * rol fuera de esta lista recibe un salto duro (ver LoginPage/ProtectedRoute), nunca un
 * `navigate()` interno (este router no tiene rutas para esos roles). */
export const MIGRATED_ROLES: UserRole[] = ["teacher", "student", "admin"];
