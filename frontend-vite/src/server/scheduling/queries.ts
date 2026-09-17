import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ClassScheduleItem } from "./types";

type Client = SupabaseClient<Database>;

/** Todos los class_schedules de todos los salones (activos e inactivos) -- horario REFERENCIAL,
 * nunca genera class_records ni bloquea nada (Slice A/F). */
export async function getAllClassSchedules(supabase: Client): Promise<ClassScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .order("classroom_id", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isActive: row.is_active,
  }));
}

export async function getClassSchedules(supabase: Client, classroomId: number): Promise<ClassScheduleItem[]> {
  const { data, error } = await supabase
    .from("class_schedules")
    .select("id, classroom_id, day_of_week, start_time, end_time, timezone, is_active")
    .eq("classroom_id", classroomId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isActive: row.is_active,
  }));
}

