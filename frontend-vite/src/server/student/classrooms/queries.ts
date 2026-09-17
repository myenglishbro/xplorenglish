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
  id: number;
  name: string;
  level: Database["public"]["Enums"]["academic_level"];
  description: string | null;
  schedule_notes: string | null;
  program: { name: string } | null;
}

/**
 * El alumno del salón es classrooms.student_id (Slice A/F) -- filtro directo por esa columna, sin
 * classroom_students. RLS (private.is_classroom_student) ya excluye salones archivados y salones
 * de otros alumnos, así que este filtro es solo una optimización de consulta, no la autoridad real.
 */
export async function listMyClassroomsAsStudent(supabase: Client, studentId: string): Promise<MyClassroomItem[]> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, level, description, schedule_notes, program:programs(name)")
    .eq("student_id", studentId)
    .returns<Row[]>();

  if (error) throw error;

  return data
    .map((row) => ({
      id: row.id,
      name: row.name,
      programName: row.program?.name ?? "—",
      level: row.level,
      description: row.description,
      scheduleNotes: row.schedule_notes,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
