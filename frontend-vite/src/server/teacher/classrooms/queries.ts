import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export interface MyClassroomItem {
  id: number;
  name: string;
  programName: string;
  level: Database["public"]["Enums"]["academic_level"];
  description: string | null;
  scheduleNotes: string | null;
}

interface Row {
  classroom: {
    id: number;
    name: string;
    level: Database["public"]["Enums"]["academic_level"];
    description: string | null;
    schedule_notes: string | null;
    program: { name: string } | null;
  } | null;
}

/**
 * Sin PRIMARY/SUBSTITUTE (Slice A/F) -- cualquier fila activa es un profesor habilitado. .eq("status",
 * "active") filtra solo LA MEMBRESÍA de este profesor en cada salón (si lo deshabilitaron, deja de
 * aparecer en su lista, aunque su historial de class_records se conserve intacto).
 */
export async function listMyClassroomsAsTeacher(supabase: Client, teacherId: string): Promise<MyClassroomItem[]> {
  const { data, error } = await supabase
    .from("classroom_teachers")
    .select(`classroom:classrooms(id, name, level, description, schedule_notes, program:programs(name))`)
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .returns<Row[]>();

  if (error) throw error;

  return data
    .filter((row): row is Row & { classroom: NonNullable<Row["classroom"]> } => !!row.classroom)
    .map((row) => ({
      id: row.classroom.id,
      name: row.classroom.name,
      programName: row.classroom.program?.name ?? "—",
      level: row.classroom.level,
      description: row.classroom.description,
      scheduleNotes: row.classroom.schedule_notes,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
