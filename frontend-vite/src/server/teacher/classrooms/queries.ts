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
    status: string;
    program: { name: string } | null;
  } | null;
}

/**
 * Sin PRIMARY/SUBSTITUTE (Slice A/F) -- cualquier fila activa es un profesor habilitado. .eq("status",
 * "active") filtra solo LA MEMBRESÍA de este profesor en cada salón (si lo deshabilitaron, deja de
 * aparecer en su lista, aunque su historial de class_records se conserve intacto).
 *
 * `classrooms!inner` + `.eq("classrooms.status","active")` (auditoría de lifecycle de salones,
 * 0044): defensa/optimización explícita, NO la autoridad real -- RLS (class_records_select ->
 * can_access_classroom -> is_classroom_teacher, que ya exige classrooms.status='active' desde
 * 0015) ya excluye un salón archivado por completo, incluso sin este filtro. Mismo criterio que
 * getMyWeeklyScheduleAsTeacher (server/teacher/schedule/queries.ts).
 */
export async function listMyClassroomsAsTeacher(supabase: Client, teacherId: string): Promise<MyClassroomItem[]> {
  const { data, error } = await supabase
    .from("classroom_teachers")
    .select(`classroom:classrooms!inner(id, name, level, description, schedule_notes, status, program:programs(name))`)
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .eq("classrooms.status", "active")
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

export interface ClassroomHistoryItem {
  [key: string]: unknown;
  classroomId: number;
  classroomName: string;
  programName: string;
  level: Database["public"]["Enums"]["academic_level"];
  /** classrooms.status: 'archived' = finalizado. */
  classroomStatus: string;
  /** false si el docente ya no tiene membresía activa en el salón. */
  isActiveMember: boolean;
  studentName: string | null;
  classesCount: number;
  rescheduledCount: number;
  totalMinutes: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  firstClassAt: string;
  lastClassAt: string;
}

export interface ClassroomHistoryRecord {
  [key: string]: unknown;
  id: number;
  occurredAt: string;
  status: Database["public"]["Enums"]["class_record_status"];
  minutes: number;
  hourlyRateSnapshot: number | null;
  amount: number | null;
  paid: boolean;
  paidAt: string | null;
  notes: string | null;
}

/**
 * get_my_classroom_history (0046): salones donde ESTE docente dictó clases, incluidos los
 * archivados que RLS le oculta (is_classroom_teacher exige classrooms.status='active'). La RPC es
 * de solo lectura y filtra por auth.uid() en el servidor -- nunca recibe un teacher_id del cliente.
 */
export async function listMyClassroomHistory(supabase: Client): Promise<ClassroomHistoryItem[]> {
  const { data, error } = await supabase.rpc("get_my_classroom_history");
  if (error) throw error;

  return data.map((r) => ({
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    programName: r.program_name ?? "—",
    level: r.level,
    classroomStatus: r.classroom_status,
    isActiveMember: r.is_active_member,
    studentName: r.student_name,
    classesCount: r.classes_count,
    rescheduledCount: r.rescheduled_count,
    totalMinutes: r.total_minutes,
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount),
    pendingAmount: Number(r.pending_amount),
    firstClassAt: r.first_class_at,
    lastClassAt: r.last_class_at,
  }));
}

export async function listMyClassroomHistoryRecords(supabase: Client, classroomId: number): Promise<ClassroomHistoryRecord[]> {
  const { data, error } = await supabase.rpc("get_my_classroom_history_records", { p_classroom_id: classroomId });
  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    status: r.status,
    minutes: r.minutes,
    hourlyRateSnapshot: r.hourly_rate_snapshot === null ? null : Number(r.hourly_rate_snapshot),
    amount: r.amount === null ? null : Number(r.amount),
    paid: r.teacher_payment_id !== null,
    paidAt: r.paid_at,
    notes: r.notes,
  }));
}
