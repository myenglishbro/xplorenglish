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

/**
 * classroom_teachers.teacher_id referencia teacher_profiles(profile_id), NO profiles(id)
 * directamente (0005) -- PostgREST no puede resolver un embed de dos saltos
 * (classroom_teachers -> teacher_profiles -> profiles) en una sola relación. Por eso los nombres
 * de docentes se resuelven aparte, con un batch fetch a profiles por id.
 */
async function fetchProfileNames(supabase: Client, ids: string[]): Promise<Map<string, { firstName: string; lastName: string }>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, { firstName: p.first_name, lastName: p.last_name }]));
}

interface ClassroomListRow {
  id: number;
  name: string;
  level: AcademicLevel;
  status: string;
  program_id: number;
  student_id: string | null;
  program: { name: string } | null;
  student: { first_name: string; last_name: string } | null;
  classroom_teachers: { status: MembershipStatus }[];
}

const LIST_SELECT = `
  id, name, level, status, program_id, student_id,
  program:programs(name),
  student:profiles!classrooms_student_id_fkey(first_name, last_name),
  classroom_teachers(status)
`;

/**
 * Saldo por salón (Slice G) -- batch fetch de hours_movements por los student_id de la página
 * actual (2 round-trips fijos, mismo patrón que getStudentHoursPackages/listHourPackagesForAdmin),
 * nunca una query por fila. null para salones sin estudiante asignado.
 */
async function fetchStudentBalances(supabase: Client, studentIds: string[]): Promise<Map<string, number>> {
  if (studentIds.length === 0) return new Map();
  const { data, error } = await supabase.from("hours_movements").select("student_id, minutes_delta").in("student_id", studentIds);
  if (error) throw error;

  const balances = new Map<string, number>();
  for (const row of data) {
    balances.set(row.student_id, (balances.get(row.student_id) ?? 0) + row.minutes_delta);
  }
  for (const id of studentIds) if (!balances.has(id)) balances.set(id, 0);
  return balances;
}

export async function listClassrooms(supabase: Client, filters: ClassroomListFilters): Promise<ClassroomListItem[]> {
  let query = supabase.from("classrooms").select(LIST_SELECT).order("name", { ascending: true });

  if (filters.programId) query = query.eq("program_id", filters.programId);
  if (filters.level && filters.level !== "all") query = query.eq("level", filters.level);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query.returns<ClassroomListRow[]>();
  if (error) throw error;

  const studentIds = [...new Set(data.map((r) => r.student_id).filter((id): id is string => id !== null))];
  const balances = await fetchStudentBalances(supabase, studentIds);

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    programId: row.program_id,
    programName: row.program?.name ?? "—",
    level: row.level,
    status: row.status as ClassroomStatus,
    studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : null,
    studentBalance: row.student_id ? (balances.get(row.student_id) ?? 0) : null,
    enabledTeacherCount: row.classroom_teachers.filter((t) => t.status === "active").length,
  }));
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
  student_id: string | null;
  student: { first_name: string; last_name: string; dni: string } | null;
  classroom_teachers: { teacher_id: string; status: MembershipStatus }[];
}

const DETAIL_SELECT = `
  id, name, level, description, schedule_notes, status, program_id, student_id,
  program:programs(name),
  student:profiles!classrooms_student_id_fkey(first_name, last_name, dni),
  classroom_teachers(teacher_id, status)
`;

export async function getClassroomDetail(supabase: Client, id: number): Promise<ClassroomDetail | null> {
  const { data, error } = await supabase
    .from("classrooms")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .returns<ClassroomDetailRow | null>();

  if (error) throw error;
  if (!data) return null;

  const activeTeacherIds = data.classroom_teachers.filter((t) => t.status === "active").map((t) => t.teacher_id);
  const names = await fetchProfileNames(supabase, activeTeacherIds);

  const teachers: TeacherMembership[] = activeTeacherIds
    .map((teacherId) => {
      const name = names.get(teacherId);
      if (!name) return null;
      return { teacherId, firstName: name.firstName, lastName: name.lastName };
    })
    .filter((t): t is TeacherMembership => !!t)
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  return {
    id: data.id,
    name: data.name,
    programId: data.program_id,
    programName: data.program?.name ?? "—",
    level: data.level,
    description: data.description,
    scheduleNotes: data.schedule_notes,
    status: data.status as ClassroomStatus,
    student:
      data.student_id && data.student
        ? { studentId: data.student_id, firstName: data.student.first_name, lastName: data.student.last_name, dni: data.student.dni }
        : null,
    teachers,
  };
}

/** Docentes activos disponibles para habilitar en un salón. Sin excluir a quien ya está habilitado
 * -- volver a seleccionarlo es un no-op idempotente, no un error. Excluye archivados
 * (profiles.archived_at) -- ciclo de vida de usuarios, versión reducida: un docente archivado no
 * debe seguir apareciendo como candidato operativo aunque su status siga en 'active'. */
export async function listAssignableTeachers(supabase: Client): Promise<AssignableTeacher[]> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("profile_id, profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name, archived_at)")
    .eq("status", "active")
    .returns<{ profile_id: string; profile: { first_name: string; last_name: string; archived_at: string | null } | null }[]>();

  if (error) throw error;

  return data
    .filter((t) => t.profile && t.profile.archived_at === null)
    .map((t) => ({ id: t.profile_id, firstName: t.profile!.first_name, lastName: t.profile!.last_name }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

/** Estudiantes activos disponibles para asignar como el único alumno de un salón. Volumen esperado
 * bajo en este MVP -- se filtra por texto en el cliente, no aquí. Excluye archivados
 * (profiles.archived_at) -- mismo criterio que listAssignableTeachers; reforzado además en
 * servidor por el trigger check_classroom_student_assignment. */
export async function listAssignableStudents(supabase: Client): Promise<AssignableStudent[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, dni")
    .eq("role", "student")
    .eq("status", "active")
    .is("archived_at", null)
    .order("first_name", { ascending: true });

  if (error) throw error;

  return data.map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name, dni: p.dni }));
}
