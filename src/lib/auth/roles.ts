import type { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** A dónde redirigir a cada rol tras login / al entrar a "/". */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};
