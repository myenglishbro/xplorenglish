import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export interface ClassroomHeader {
  id: number;
  name: string;
  level: string;
  description: string | null;
  scheduleNotes: string | null;
  programName: string | null;
}

interface ClassroomHeaderRow {
  id: number;
  name: string;
  level: string;
  description: string | null;
  schedule_notes: string | null;
  program: { name: string } | null;
}

/** Portado de src/app/{teacher,student}/salones/[id]/page.tsx -- mismo select (superset de
 * ambos), RLS (classrooms_select) ya devuelve null si este usuario no tiene acceso al salón. */
export async function getClassroomHeader(supabase: Client, classroomId: number): Promise<ClassroomHeader | null> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, level, description, schedule_notes, program:programs(name)")
    .eq("id", classroomId)
    .maybeSingle()
    .returns<ClassroomHeaderRow | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    level: data.level,
    description: data.description,
    scheduleNotes: data.schedule_notes,
    programName: data.program?.name ?? null,
  };
}
