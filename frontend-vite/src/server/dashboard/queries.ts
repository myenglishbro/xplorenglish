import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  DashboardActivityItem,
  DashboardAlert,
  DashboardData,
  DashboardKpis,
  KpiValue,
  RecentStudent,
  SectionResult,
  WeeklyAgendaBlock,
} from "./types";

type Client = SupabaseClient<Database>;

function errorSection<T>(err: unknown): SectionResult<T> {
  return { status: "error", message: err instanceof Error ? err.message : "Error desconocido" };
}

function toCountKpi(res: { count: number | null; error: unknown }): KpiValue {
  if (res.error) return { status: "error" };
  return { status: "ok", value: res.count ?? 0 };
}

/** classroom_teachers.teacher_id y class_records/teacher_payments.teacher_id son directamente el
 * id de profiles (teacher_profiles.profile_id es su PK y coincide con profiles.id) -- un solo
 * batch fetch, sin pasar por teacher_profiles. */
async function fetchProfileNames(supabase: Client, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
}

/**
 * 3 KPIs, cada uno aislado (ver KpiValue en ./types). Ajuste post-Slice H: se retiran
 * "Clases de hoy" (class_schedules es planificación referencial) y "Pagos estudiantes pendientes"
 * (no existe venta a crédito en el modelo actual) -- "Sin saldo" vive en la página, reutilizando
 * useStudentBalanceAlerts (Slice G), no una query nueva acá.
 */
export async function getDashboardKpis(supabase: Client): Promise<SectionResult<DashboardKpis>> {
  try {
    const [studentsRes, teachersRes, classroomsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student")
        .eq("status", "active"),
      supabase
        .from("teacher_profiles")
        .select("profile_id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("classrooms").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    return {
      status: "ok",
      data: {
        activeStudents: toCountKpi(studentsRes),
        activeTeachers: toCountKpi(teachersRes),
        activeClassrooms: toCountKpi(classroomsRes),
      },
    };
  } catch (err) {
    return errorSection(err);
  }
}

interface AgendaScheduleRow {
  id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom: {
    name: string;
    level: Database["public"]["Enums"]["academic_level"];
    student_id: string | null;
    program: { name: string } | null;
  } | null;
}

const AGENDA_SELECT = `
  id, classroom_id, day_of_week, start_time, end_time,
  classroom:classrooms!inner(name, level, status, student_id, program:programs(name))
`;

/** Todos los profesores activos por salón (no solo uno) -- la Agenda necesita distinguir "sin
 * profesor" / "un profesor" (nombre) / "N profesores", nunca elegir uno arbitrariamente. */
async function fetchActiveTeacherNamesByClassroom(supabase: Client, classroomIds: number[]): Promise<Map<number, string[]>> {
  if (classroomIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("classroom_teachers")
    .select("classroom_id, teacher_id")
    .eq("status", "active")
    .in("classroom_id", classroomIds);
  if (error) throw error;

  const names = await fetchProfileNames(supabase, [...new Set(data.map((r) => r.teacher_id))]);

  const byClassroom = new Map<number, string[]>();
  for (const row of data) {
    const name = names.get(row.teacher_id);
    if (!name) continue;
    const list = byClassroom.get(row.classroom_id) ?? [];
    list.push(name);
    byClassroom.set(row.classroom_id, list);
  }
  return byClassroom;
}

/**
 * Agenda semanal (ajuste post-Slice H) -- PROYECCIÓN visual del horario semanal recurrente
 * (class_schedules), NUNCA class_records. Un solo fetch de todos los class_schedules activos de
 * salones activos (sin filtrar por semana: la recurrencia es la misma toda semana, la UI decide qué
 * fechas reales corresponden a dayOfWeek según la semana seleccionada) + 2 batch fetches (nombres de
 * alumno, profesores por salón) -- 3 round-trips fijos, nunca uno por schedule.
 */
export async function getWeeklyAgenda(supabase: Client): Promise<SectionResult<WeeklyAgendaBlock[]>> {
  try {
    const { data, error } = await supabase
      .from("class_schedules")
      .select(AGENDA_SELECT)
      .eq("is_active", true)
      .eq("classrooms.status", "active")
      .returns<AgendaScheduleRow[]>();

    if (error) throw error;

    const studentIds = [...new Set(data.map((r) => r.classroom?.student_id).filter((id): id is string => !!id))];
    const classroomIds = [...new Set(data.map((r) => r.classroom_id))];

    const [studentNames, teacherNamesByClassroom] = await Promise.all([
      fetchProfileNames(supabase, studentIds),
      fetchActiveTeacherNamesByClassroom(supabase, classroomIds),
    ]);

    const blocks: WeeklyAgendaBlock[] = data.map((row) => ({
      id: row.id,
      classroomId: row.classroom_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      classroomName: row.classroom?.name ?? "Salón sin nombre",
      studentName: row.classroom?.student_id ? (studentNames.get(row.classroom.student_id) ?? null) : null,
      level: row.classroom?.level ?? null,
      programName: row.classroom?.program?.name ?? null,
      teacherNames: teacherNamesByClassroom.get(row.classroom_id) ?? [],
    }));

    return { status: "ok", data: blocks };
  } catch (err) {
    return errorSection(err);
  }
}

/**
 * Alertas operativas del dashboard admin. Ya no hay PRIMARY/SUBSTITUTE (classroom_without_primary)
 * ni sesiones programadas que puedan quedar "vencidas sin resolver" (sessions no existe), ni flujo
 * de recibos/periodos docentes (teacher_payment_periods no existe, pay_teacher_classes paga
 * directo). Sus equivalentes reales: salón activo sin ningún profesor habilitado, y clases ya
 * registradas (PRESENT/ABSENT con monto) que siguen sin pagarse.
 */
export async function getDashboardAlerts(supabase: Client): Promise<SectionResult<DashboardAlert[]>> {
  try {
    const [{ data: classroomRows, error: classroomsError }, { count: pendingPaymentCount, error: pendingPaymentError }] = await Promise.all([
      supabase.from("classrooms").select("id, name, classroom_teachers(status)").eq("status", "active"),
      supabase
        .from("class_records")
        .select("id", { count: "exact", head: true })
        .is("teacher_payment_id", null)
        .not("amount", "is", null)
        .in("status", ["present", "absent"]),
    ]);

    if (classroomsError) throw classroomsError;
    if (pendingPaymentError) throw pendingPaymentError;

    const alerts: DashboardAlert[] = [];

    const classroomsWithoutTeacher = classroomRows.filter(
      (c) => !c.classroom_teachers.some((t) => t.status === "active"),
    );
    if (classroomsWithoutTeacher.length > 0) {
      alerts.push({
        kind: "classroom_without_teacher",
        label: "Salones activos sin ningún profesor habilitado",
        detail: classroomsWithoutTeacher.map((c) => c.name).join(", "),
        href: "/admin/salones",
      });
    }

    if ((pendingPaymentCount ?? 0) > 0) {
      alerts.push({
        kind: "teacher_classes_pending_payment",
        label: "Clases registradas pendientes de pago a docentes",
        detail: `${pendingPaymentCount} clase(s) registrada(s) que todavía no se han pagado`,
        href: "/admin/pagos-docentes",
      });
    }

    return { status: "ok", data: alerts };
  } catch (err) {
    return errorSection(err);
  }
}

interface PaymentActivityRow {
  id: number;
  amount: number;
  paid_at: string | null;
  created_at: string;
  student: { first_name: string; last_name: string } | null;
}

interface TeacherPaymentRow {
  id: number;
  teacher_id: string;
  total_amount: number;
  paid_at: string;
}

/** Actividad reciente unificada: pagos de estudiantes completados + pagos a docentes (teacher_payments,
 * reemplaza teacher_payment_periods eliminada en Slice A). */
export async function getRecentActivity(supabase: Client): Promise<SectionResult<DashboardActivityItem[]>> {
  try {
    const [paymentsRes, teacherPaymentsRes] = await Promise.all([
      supabase
        .from("student_payments")
        .select("id, amount, paid_at, created_at, student:profiles(first_name,last_name)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<PaymentActivityRow[]>(),
      supabase
        .from("teacher_payments")
        .select("id, teacher_id, total_amount, paid_at")
        .order("paid_at", { ascending: false })
        .limit(10)
        .returns<TeacherPaymentRow[]>(),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (teacherPaymentsRes.error) throw teacherPaymentsRes.error;

    const teacherNames = await fetchProfileNames(supabase, [...new Set(teacherPaymentsRes.data.map((r) => r.teacher_id))]);

    const paymentItems: DashboardActivityItem[] = paymentsRes.data.map((row) => ({
      kind: "student_payment_completed",
      id: row.id,
      personName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "Estudiante",
      amount: row.amount,
      occurredAt: row.paid_at ?? row.created_at,
    }));

    const teacherPaymentItems: DashboardActivityItem[] = teacherPaymentsRes.data.map((row) => ({
      kind: "teacher_period_paid",
      id: row.id,
      personName: teacherNames.get(row.teacher_id) ?? "Docente",
      amount: row.total_amount,
      occurredAt: row.paid_at,
    }));

    const merged = [...paymentItems, ...teacherPaymentItems]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 8);

    return { status: "ok", data: merged };
  } catch (err) {
    return errorSection(err);
  }
}

export async function getRecentStudents(supabase: Client): Promise<SectionResult<RecentStudent[]>> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return {
      status: "ok",
      data: data.map((row) => ({
        id: row.id,
        fullName: `${row.first_name} ${row.last_name}`,
        createdAt: row.created_at,
      })),
    };
  } catch (err) {
    return errorSection(err);
  }
}

export async function getDashboardData(supabase: Client): Promise<DashboardData> {
  const [kpis, agenda, alerts, recentActivity, recentStudents] = await Promise.allSettled([
    getDashboardKpis(supabase),
    getWeeklyAgenda(supabase),
    getDashboardAlerts(supabase),
    getRecentActivity(supabase),
    getRecentStudents(supabase),
  ]);

  function unwrap<T>(res: PromiseSettledResult<SectionResult<T>>): SectionResult<T> {
    return res.status === "fulfilled" ? res.value : errorSection(res.reason);
  }

  return {
    kpis: unwrap(kpis),
    agenda: unwrap(agenda),
    alerts: unwrap(alerts),
    recentActivity: unwrap(recentActivity),
    recentStudents: unwrap(recentStudents),
  };
}
