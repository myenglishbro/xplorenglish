import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AvailabilityBlockDraft, AvailabilityBlockItem } from "./types";

type Client = SupabaseClient<Database>;

/**
 * LECTURA -- browser → Supabase → RLS (teacher_availability_owner, 0003). Nunca filtra por
 * teacher_id explícito: RLS ya acota a auth.uid().
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
  INVALID_INPUT: "Los datos enviados no son válidos.",
  INVALID_DAY: "Uno de los días seleccionados no es válido.",
  INVALID_TIME_RANGE: "La hora de fin debe ser mayor que la de inicio.",
  OUT_OF_RANGE: "Los bloques deben estar entre las 06:00 y las 23:00.",
  OVERLAPPING_BLOCKS: "Hay bloques solapados o duplicados en el mismo día.",
};

function parseRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(RPC_ERROR_MESSAGES[code] ?? "No pudimos guardar tu disponibilidad. Inténtalo de nuevo en unos minutos.");
}

function mapRow(row: { id: number; day_of_week: number; start_time: string; end_time: string; timezone: string }): AvailabilityBlockItem {
  return { id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time, timezone: row.timezone };
}

/**
 * Reemplazo TOTAL de la disponibilidad semanal del profesor autenticado en una sola llamada
 * (Slice D, set_my_teacher_availability) -- reemplaza el CRUD fila-a-fila anterior
 * (create/update/delete_my_teacher_availability, retirado en esta misma migración). teacher_id
 * nunca viaja desde el cliente; el RPC lo resuelve de auth.uid().
 */
export async function setMyAvailability(supabase: Client, blocks: AvailabilityBlockDraft[]): Promise<AvailabilityBlockItem[]> {
  const { data, error } = await supabase.rpc("set_my_teacher_availability", {
    p_blocks: blocks.map((b) => ({ dayOfWeek: b.dayOfWeek, startTime: b.startTime, endTime: b.endTime })),
  });
  if (error) throw parseRpcError(error);
  return (data ?? []).map(mapRow);
}
