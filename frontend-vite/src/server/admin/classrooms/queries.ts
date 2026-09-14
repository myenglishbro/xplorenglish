import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AcademicLevel,
  AssignableStudent,
  AssignableTeacher,
  ClassroomDetail,
  ClassroomListFilters,
  ClassroomListItem,
  ClassroomStatus,
  TeacherMembership,
} from "./types";

type Client = SupabaseClient<Database>;

type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type TeacherRole = Database["public"]["Enums"]["classroom_teacher_role"];

interface RawTeacherRow {
  teacher_id: string;
  teacher_role: TeacherRole;
  status: MembershipStatus;
}

interface RawStudentRow {
  student_id: string;
  status: MembershipStatus;
}

/**
 * classroom_teachers.teacher_id referencia teacher_profiles(profile_id), NO profiles(id)
 * directamente (0005) -- PostgREST no puede resolver un embed de dos saltos
 * (classroom_teachers -> teacher_profiles -> profiles) en una sola relación. Por eso los nombres
 * de docentes se resuelven aparte, con un batch fetch a profiles por id, en vez de un embed.
 * classroom_students.student_id sí referencia profiles(id) directo, así que ese embed es válido.
 */
async function fetchProfileNames(
  supabase: Client,
  ids: string[]
): Promise<Map<string, { firstName: string; lastName: string }>> {
  if (ids.length === 0) return new Map();
  const __t0 = performance.now();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
  console.log(`[perf] fetchProfileNames (${ids.length} ids): ${(performance.now() - __t0).toFixed(1)}ms`);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, { firstName: p.first_name, lastName: p.last_name }]));
}

interface ClassroomListRow {
  id: number;
  name: string;
  level: AcademicLevel;
  status: string;
  program_id: number;
  program: { name: string } | null;
  classroom_teachers: RawTeacherRow[];
  classroom_students: RawStudentRow[];
}

const LIST_SELECT = `
  id, name, level, status, program_id,
  program:programs(name),
  classroom_teachers(teacher_id, teacher_role, status),
  classroom_students(student_id, status)
`;

export async function listClassrooms(supabase: Client, filters: ClassroomListFilters): Promise<ClassroomListItem[]> {
  let query = supabase.from("classrooms").select(LIST_SELECT).order("name", { ascending: true });

  if (filters.programId) query = query.eq("program_id", filters.programId);
  if (filters.level && filters.level !== "all") query = query.eq("level", filters.level);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const __t0 = performance.now();
  const { data, error } = await query.returns<ClassroomListRow[]>();
  console.log(`[perf] listClassrooms -> main select: ${(performance.now() - __t0).toFixed(1)}ms`);
  if (error) throw error;

  const primaryTeacherIds = data
    .map((row) => row.classroom_teachers.find((t) => t.teacher_role === "PRIMARY" && t.status === "active"))
    .filter((t): t is RawTeacherRow => !!t)
    .map((t) => t.teacher_id);

  const names = await fetchProfileNames(supabase, [...new Set(primaryTeacherIds)]);

  return data.map((row) => {
    const primary = row.classroom_teachers.find((t) => t.teacher_role === "PRIMARY" && t.status === "active");
    const primaryName = primary ? names.get(primary.teacher_id) : undefined;

    return {
      id: row.id,
      name: row.name,
      programId: row.program_id,
      programName: row.program?.name ?? "—",
      level: row.level,
      status: row.status as ClassroomStatus,
      primaryTeacherName: primaryName ? `${primaryName.firstName} ${primaryName.lastName}` : null,
      studentCount: row.classroom_students.filter((s) => s.status === "active").length,
    };
  });
}

interface ClassroomDetailRow {
  id: number;
  name: string;
  level: AcademicLevel;
  description: string | null;
  schedule_notes: string | null;
  status: string;
  program_id: number;
  program: { name: string } | null;
  classroom_teachers: RawTeacherRow[];
  classroom_students: (RawStudentRow & { student: { first_name: string; last_name: string; dni: string } | null })[];
}

const DETAIL_SELECT = `
  id, name, level, description, schedule_notes, status, program_id,
  program:programs(name),
  classroom_teachers(teacher_id, teacher_role, status),
  classroom_students(student_id, status, student:profiles!classroom_students_student_id_fkey(first_name, last_name, dni))
`;

export async function getClassroomDetail(supabase: Client, id: number): Promise<ClassroomDetail | null> {
  const __t0 = performance.now();
  const { data, error } = await supabase
    .from("classrooms")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .returns<ClassroomDetailRow | null>();
  console.log(`[perf] getClassroomDetail -> main select: ${(performance.now() - __t0).toFixed(1)}ms`);

  if (error) throw error;
  if (!data) return null;

  const activeTeachers = data.classroom_teachers.filter((t) => t.status === "active");
  const names = await fetchProfileNames(
    supabase,
    activeTeachers.map((t) => t.teacher_id)
  );

  const teachers: TeacherMembership[] = activeTeachers
    .map((t) => {
      const name = names.get(t.teacher_id);
      if (!name) return null;
      return { teacherId: t.teacher_id, firstName: name.firstName, lastName: name.lastName, role: t.teacher_role };
    })
    .filter((t): t is TeacherMembership => !!t)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "PRIMARY" ? -1 : 1));

  return {
    id: data.id,
    name: data.name,
    programId: data.program_id,
    programName: data.program?.name ?? "—",
    level: data.level,
    description: data.description,
    scheduleNotes: data.schedule_notes,
    status: data.status as ClassroomStatus,
    teachers,
    students: data.classroom_students
      .filter((s) => s.status === "active" && s.student)
      .map((s) => ({
        studentId: s.student_id,
        firstName: s.student!.first_name,
        lastName: s.student!.last_name,
        dni: s.student!.dni,
      })),
  };
}

/** Docentes activos disponibles para asignar (titular o suplente). Sin excluir a quien ya está
 * asignado a este salón -- volver a seleccionarlo es un no-op idempotente, no un error. */
export async function listAssignableTeachers(supabase: Client): Promise<AssignableTeacher[]> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("profile_id, profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name)")
    .eq("status", "active")
    .returns<{ profile_id: string; profile: { first_name: string; last_name: string } | null }[]>();

  if (error) throw error;

  return data
    .filter((t) => t.profile)
    .map((t) => ({ id: t.profile_id, firstName: t.profile!.first_name, lastName: t.profile!.last_name }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

/** Estudiantes activos disponibles para enrolar. Volumen esperado bajo en este MVP -- se filtra
 * por texto en el cliente, no aquí. */
export async function listAssignableStudents(supabase: Client): Promise<AssignableStudent[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, dni")
    .eq("role", "student")
    .eq("status", "active")
    .order("first_name", { ascending: true });

  if (error) throw error;

  return data.map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name, dni: p.dni }));
}
