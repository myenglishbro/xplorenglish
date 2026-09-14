import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export interface MyClassroomItem {
  id: number;
  name: string;
  programName: string;
  level: Database["public"]["Enums"]["academic_level"];
  role: Database["public"]["Enums"]["classroom_teacher_role"];
  description: string | null;
  scheduleNotes: string | null;
  studentCount: number;
}

interface Row {
  teacher_role: Database["public"]["Enums"]["classroom_teacher_role"];
  classroom: {
    id: number;
    name: string;
    level: Database["public"]["Enums"]["academic_level"];
    description: string | null;
    schedule_notes: string | null;
    program: { name: string } | null;
    classroom_students: { status: Database["public"]["Enums"]["membership_status"] }[];
  } | null;
}

/**
 * .eq("teacher_id", teacherId) es necesario aunque RLS ya limite qué salones son visibles: la
 * policy de classroom_teachers (can_access_classroom) también deja ver, en un salón propio, las
 * filas de OTROS docentes de ese mismo salón -- sin este filtro, un docente vería su propia fila
 * mezclada con las de sus co-docentes en el mismo resultado.
 *
 * RLS (private.is_classroom_teacher, 0015) ya excluye salones archivados -- no hace falta
 * filtrar classrooms.status aquí.
 */
export async function listMyClassroomsAsTeacher(supabase: Client, teacherId: string): Promise<MyClassroomItem[]> {
  const { data, error } = await supabase
    .from("classroom_teachers")
    .select(
      `teacher_role, classroom:classrooms(id, name, level, description, schedule_notes, program:programs(name), classroom_students(status))`
    )
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
      role: row.teacher_role,
      description: row.classroom.description,
      scheduleNotes: row.classroom.schedule_notes,
      studentCount: row.classroom.classroom_students.filter((s) => s.status === "active").length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
