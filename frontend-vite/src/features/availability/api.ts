import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { secureApiCall } from "@/lib/apiClient";
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

/**
 * MUTACIONES -- browser-direct NO aprobado todavía (teacher_profiles.status==='active' no está
 * replicado en RLS). Van por el Route Handler seguro del Next viejo, que reutiliza
 * requireActiveTeacherId() + el mismo Zod schema + Supabase server client "as user" (JWT real vía
 * Bearer, ver lib/apiClient.ts). teacher_id NUNCA viaja en el body -- el handler lo resuelve del
 * token, igual que la Server Action original.
 */
export async function createAvailabilityBlock(input: AvailabilityBlockInput): Promise<void> {
  await secureApiCall("/api/teacher/availability", { method: "POST", body: input });
}

export async function updateAvailabilityBlock(id: number, input: AvailabilityBlockInput): Promise<void> {
  await secureApiCall(`/api/teacher/availability/${id}`, { method: "PATCH", body: input });
}

export async function deleteAvailabilityBlock(id: number): Promise<void> {
  await secureApiCall(`/api/teacher/availability/${id}`, { method: "DELETE" });
}
