import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AvailabilityBlockItem } from "./types";
import type { AvailabilityBlockInput } from "./validation";

type Client = SupabaseClient<Database>;

/**
 * LECTURA -- browser → Supabase → RLS, portado literal de
 * src/server/teacher/availability/queries.ts (getMyAvailability). Nunca filtra por teacher_id
 * explícito: RLS (teacher_availability_owner) ya acota a auth.uid().
 */
export async function getMyAvailability(supabase: Client): Promise<AvailabilityBlockItem[]> {
  const { data, error } = await supabase
    .from("teacher_availability")
    .select("id, day_of_week, start_time, end_time, timezone")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
  }));
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para docentes.",
  TEACHER_INACTIVE: "Tu perfil docente está inactivo; contacta a un administrador para reactivarlo.",
  INVALID_DAY: "Día inválido.",
  INVALID_TIME_RANGE: "La hora de fin debe ser mayor que la de inicio.",
  BLOCK_NOT_FOUND: "Ese bloque de disponibilidad no existe.",
};

function parseRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.");
}

function mapRow(row: { id: number; day_of_week: number; start_time: string; end_time: string; timezone: string }): AvailabilityBlockItem {
  return { id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time, timezone: row.timezone };
}

/**
 * MUTACIONES -- browser → Supabase RPC → Postgres, directo (migración 0021:
 * create_my_teacher_availability / update_my_teacher_availability / delete_my_teacher_availability).
 * Ya no pasan por el Route Handler de Next (eliminado) -- teacher_id NUNCA viaja desde el cliente
 * (los RPCs ni siquiera lo reciben como parámetro, lo resuelven de auth.uid()) y el RPC valida
 * role='teacher' + teacher_profiles.status='active' dentro de la DB (private.require_active_teacher,
 * 0021), la misma regla que aplicaba requireActiveTeacherId() en el guard de Next que reemplazan.
 */
export async function createAvailabilityBlock(supabase: Client, input: AvailabilityBlockInput): Promise<AvailabilityBlockItem> {
  const { data, error } = await supabase
    .rpc("create_my_teacher_availability", {
      p_day_of_week: input.dayOfWeek,
      p_start_time: input.startTime,
      p_end_time: input.endTime,
    })
    .single();
  if (error) throw parseRpcError(error);
  return mapRow(data);
}

export async function updateAvailabilityBlock(supabase: Client, id: number, input: AvailabilityBlockInput): Promise<AvailabilityBlockItem> {
  const { data, error } = await supabase
    .rpc("update_my_teacher_availability", {
      p_id: id,
      p_day_of_week: input.dayOfWeek,
      p_start_time: input.startTime,
      p_end_time: input.endTime,
    })
    .single();
  if (error) throw parseRpcError(error);
  return mapRow(data);
}

export async function deleteAvailabilityBlock(supabase: Client, id: number): Promise<void> {
  const { error } = await supabase.rpc("delete_my_teacher_availability", { p_id: id });
  if (error) throw parseRpcError(error);
}
