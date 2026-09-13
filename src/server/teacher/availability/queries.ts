import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AvailabilityBlockItem } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Nunca se recibe ni se filtra por un teacherId explícito -- RLS (teacher_availability_owner,
 * 0003) ya acota esta query a las filas del usuario autenticado (auth.uid()), mismo criterio
 * que getStudentHoursPackages en server/hours/queries.ts. No hay ningún parámetro público que un
 * cliente pudiera manipular para ver la disponibilidad de otro docente.
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
