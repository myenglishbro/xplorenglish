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
  studentCount: number;
  primaryTeacherName: string | null;
}

interface Row {
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
 * El nombre del docente titular NO se puede leer de profiles directo (profiles_select, 0003, es
 * "solo tu propia fila o admin") -- se resuelve con classroom_primary_teacher_name() (0015), una
 * función acotada que solo expone first_name/last_name del PRIMARY activo, nunca dni/phone/email.
 * Sin roster de compañeros en este MVP -- aprobado explícitamente así (privacidad): solo el
 * conteo total de estudiantes, ningún nombre de otro estudiante.
 *
 * RLS (private.is_classroom_student, 0015) ya excluye salones archivados -- no hace falta
 * filtrar classrooms.status aquí.
 */
export async function listMyClassroomsAsStudent(supabase: Client, studentId: string): Promise<MyClassroomItem[]> {
  const __t0 = performance.now();
  const { data, error } = await supabase
    .from("classroom_students")
    .select(`classroom:classrooms(id, name, level, description, schedule_notes, program:programs(name), classroom_students(status))`)
    .eq("student_id", studentId)
    .eq("status", "active")
    .returns<Row[]>();
  console.log(`[perf] listMyClassroomsAsStudent -> main select: ${(performance.now() - __t0).toFixed(1)}ms`);

  if (error) throw error;

  const classrooms = data.filter((row): row is Row & { classroom: NonNullable<Row["classroom"]> } => !!row.classroom);

  const __t1 = performance.now();
  const withTeacherNames = await Promise.all(
    classrooms.map(async (row) => {
      const { data: teacherRows, error: teacherError } = await supabase.rpc("classroom_primary_teacher_name", {
        p_classroom_id: row.classroom.id,
      });
      if (teacherError) throw teacherError;
      const teacher = teacherRows?.[0];

      return {
        id: row.classroom.id,
        name: row.classroom.name,
        programName: row.classroom.program?.name ?? "—",
        level: row.classroom.level,
        description: row.classroom.description,
        scheduleNotes: row.classroom.schedule_notes,
        studentCount: row.classroom.classroom_students.filter((s) => s.status === "active").length,
        primaryTeacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      };
    })
  );
  console.log(`[perf] listMyClassroomsAsStudent -> ${classrooms.length}x classroom_primary_teacher_name RPC (Promise.all): ${(performance.now() - __t1).toFixed(1)}ms`);

  return withTeacherNames.sort((a, b) => a.name.localeCompare(b.name));
}
