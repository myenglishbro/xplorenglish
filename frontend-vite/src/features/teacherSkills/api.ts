import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { SkillItem } from "./types";

type Client = SupabaseClient<Database>;

/** Catálogo completo (skills_select_authenticated, 0002/0003) -- cualquier usuario autenticado
 * puede leerlo, sembrado idempotentemente en Slice D (0029) con A1..C2 + Kids/Teens/Cambridge. */
export async function getSkillsCatalog(supabase: Client): Promise<SkillItem[]> {
  const { data, error } = await supabase.from("skills").select("id, name").order("id", { ascending: true });
  if (error) throw error;
  return data;
}

/** Selección actual del profesor autenticado (teacher_skills_owner, 0003) -- nunca filtra por
 * teacher_id explícito, RLS ya acota a auth.uid(). */
export async function getMyTeacherSkillIds(supabase: Client): Promise<number[]> {
  const { data, error } = await supabase.from("teacher_skills").select("skill_id");
  if (error) throw error;
  return data.map((row) => row.skill_id);
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para docentes.",
  TEACHER_INACTIVE: "Tu perfil docente está inactivo; contacta a un administrador para reactivarlo.",
  INVALID_INPUT: "Los datos enviados no son válidos.",
  INVALID_SKILL: "Alguno de los niveles seleccionados no existe.",
};

function parseRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(RPC_ERROR_MESSAGES[code] ?? "No pudimos guardar tus niveles. Inténtalo de nuevo en unos minutos.");
}

/**
 * Reemplazo TOTAL de la selección de niveles del profesor autenticado (Slice D,
 * set_my_teacher_skills). teacher_id nunca viaja desde el cliente.
 */
export async function setMyTeacherSkills(supabase: Client, skillIds: number[]): Promise<SkillItem[]> {
  const { data, error } = await supabase.rpc("set_my_teacher_skills", { p_skill_ids: skillIds });
  if (error) throw parseRpcError(error);
  return data ?? [];
}
