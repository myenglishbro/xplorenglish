import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ClassroomBasics, ClassroomPeople, ClassroomTeacherName } from "./types";

type Client = SupabaseClient<Database>;

interface BasicsRow {
  id: number;
  name: string;
  level: string;
  description: string | null;
  schedule_notes: string | null;
  program: { name: string } | null;
}

/** classrooms + programs son legibles por cualquier rol con acceso al salón (classrooms_select,
 * can_access_classroom) -- sin RPC, select directo. */
export async function getClassroomBasics(supabase: Client, classroomId: number): Promise<ClassroomBasics | null> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, level, description, schedule_notes, program:programs(name)")
    .eq("id", classroomId)
    .maybeSingle()
    .returns<BasicsRow | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    level: data.level,
    programName: data.program?.name ?? null,
    description: data.description,
    scheduleNotes: data.schedule_notes,
  };
}

export async function getClassroomPeople(supabase: Client, classroomId: number): Promise<ClassroomPeople> {
  const { data, error } = await supabase.rpc("get_classroom_people", { p_classroom_id: classroomId }).single();
  if (error) throw error;

  return {
    studentId: data.student_id,
    studentName: data.student_first_name ? `${data.student_first_name} ${data.student_last_name}` : null,
    teachers: (data.teachers as unknown as ClassroomTeacherName[]) ?? [],
  };
}
