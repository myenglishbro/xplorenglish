import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getTodayRangeInLima } from "@/lib/datetime/lima";
import type {
  ClassesToday,
  DashboardActivityItem,
  DashboardAlert,
  DashboardData,
  DashboardKpis,
  DashboardSession,
  KpiValue,
  RecentStudent,
  SectionResult,
} from "./types";

type Client = SupabaseClient<Database>;

function errorSection<T>(err: unknown): SectionResult<T> {
  return { status: "error", message: err instanceof Error ? err.message : "Error desconocido" };
}

function toCountKpi(res: { count: number | null; error: unknown }): KpiValue {
  if (res.error) return { status: "error" };
  return { status: "ok", value: res.count ?? 0 };
}

/**
 * 5 KPIs, cada uno aislado: si una consulta falla, las otras 4 se muestran igual --
 * un KPI en error nunca se confunde con un 0 real (ver KpiValue en ./types).
 */
export async function getDashboardKpis(
  supabase: Client,
  todayRange: { start: Date; end: Date }
): Promise<SectionResult<DashboardKpis>> {
  try {
    const [studentsRes, teachersRes, classroomsRes, sessionsRes, paymentsRes] = await Promise.all([
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
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_start", todayRange.start.toISOString())
        .lt("scheduled_start", todayRange.end.toISOString()),
      supabase.from("student_payments").select("amount").eq("status", "pending"),
    ]);

    const pendingStudentPayments: KpiValue<{ count: number; totalAmount: number }> = paymentsRes.error
      ? { status: "error" }
      : {
          status: "ok",
          value: {
            count: paymentsRes.data.length,
            totalAmount: paymentsRes.data.reduce((sum, row) => sum + Number(row.amount), 0),
          },
        };

    return {
      status: "ok",
      data: {
        activeStudents: toCountKpi(studentsRes),
        activeTeachers: toCountKpi(teachersRes),
        activeClassrooms: toCountKpi(classroomsRes),
        todaySessionsCount: toCountKpi(sessionsRes),
        pendingStudentPayments,
      },
    };
  } catch (err) {
    return errorSection(err);
  }
}

interface SessionEmbedRow {
  id: number;
  scheduled_start: string;
  scheduled_end: string;
  status: Database["public"]["Enums"]["session_status"];
  classroom: { name: string } | null;
  scheduled_teacher: { profiles: { first_name: string; last_name: string } | null } | null;
  actual_teacher: { profiles: { first_name: string; last_name: string } | null } | null;
}

const SESSION_SELECT = `
  id,
  scheduled_start,
  scheduled_end,
  status,
  classroom:classrooms(name),
  scheduled_teacher:teacher_profiles!sessions_scheduled_teacher_id_fkey(profiles(first_name,last_name)),
  actual_teacher:teacher_profiles!sessions_actual_teacher_id_fkey(profiles(first_name,last_name))
`;

function mapSessionRow(row: SessionEmbedRow): DashboardSession {
  const teacherProfile = row.actual_teacher?.profiles ?? row.scheduled_teacher?.profiles ?? null;
  return {
    id: row.id,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    classroomName: row.classroom?.name ?? "Salón sin nombre",
    teacherName: teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : null,
    status: row.status,
  };
}

/**
 * Clases de hoy (día calendario en America/Lima, ver getTodayRangeInLima). Si no hay
 * ninguna, cae a las próximas 5 sesiones futuras, marcadas explícitamente
 * mode:"upcoming" -- nunca se mezclan en silencio con las de hoy.
 */
export async function getClassesToday(supabase: Client, now: Date): Promise<SectionResult<ClassesToday>> {
  try {
    const todayRange = getTodayRangeInLima(now);

    const { data: todayRows, error: todayError } = await supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .gte("scheduled_start", todayRange.start.toISOString())
      .lt("scheduled_start", todayRange.end.toISOString())
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true })
      .returns<SessionEmbedRow[]>();

    if (todayError) throw todayError;

    if (todayRows.length > 0) {
      return { status: "ok", data: { mode: "today", sessions: todayRows.map(mapSessionRow) } };
    }

    const { data: upcomingRows, error: upcomingError } = await supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .gte("scheduled_start", now.toISOString())
      .eq("status", "scheduled")
      .order("scheduled_start", { ascending: true })
      .limit(5)
      .returns<SessionEmbedRow[]>();

    if (upcomingError) throw upcomingError;

    return { status: "ok", data: { mode: "upcoming", sessions: upcomingRows.map(mapSessionRow) } };
  } catch (err) {
    return errorSection(err);
  }
}

/**
 * Las 4 alertas del MVP v1. Se calculan juntas y fallan cerradas: si cualquiera de las
 * consultas falla, toda la sección se reporta en error en vez de omitir en silencio
 * justo la alerta que falló (una alerta ausente por error se vería igual que "todo
 * bien", que es precisamente lo que no debe pasar en una alerta).
 */
export async function getDashboardAlerts(supabase: Client, now: Date): Promise<SectionResult<DashboardAlert[]>> {
  try {
    const [
      { data: activeClassrooms, error: classroomsError },
      { data: primaryTeacherRows, error: primariesError },
      { count: overdueCount, error: overdueError },
      { count: pendingReceiptCount, error: pendingReceiptError },
      { count: awaitingPaymentCount, error: awaitingPaymentError },
    ] = await Promise.all([
      supabase.from("classrooms").select("id, name").eq("status", "active"),
      supabase
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_role", "PRIMARY")
        .eq("status", "active"),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .lt("scheduled_end", now.toISOString()),
      supabase
        .from("teacher_payment_periods")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_receipt"),
      supabase
        .from("teacher_payment_periods")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);

    if (classroomsError) throw classroomsError;
    if (primariesError) throw primariesError;
    if (overdueError) throw overdueError;
    if (pendingReceiptError) throw pendingReceiptError;
    if (awaitingPaymentError) throw awaitingPaymentError;

    const alerts: DashboardAlert[] = [];

    const primaryClassroomIds = new Set(primaryTeacherRows.map((r) => r.classroom_id));
    const classroomsWithoutPrimary = activeClassrooms.filter((c) => !primaryClassroomIds.has(c.id));
    if (classroomsWithoutPrimary.length > 0) {
      alerts.push({
        kind: "classroom_without_primary",
        label: "Salones activos sin docente PRIMARY",
        detail: classroomsWithoutPrimary.map((c) => c.name).join(", "),
        href: "/admin/salones",
      });
    }

    if ((overdueCount ?? 0) > 0) {
      alerts.push({
        kind: "session_overdue_unresolved",
        label: "Sesiones vencidas sin resolver",
        detail: `${overdueCount} sesión(es) programada(s) cuyo horario ya pasó y sigue sin marcarse como completada, cancelada o reprogramada`,
        href: "/admin/calendario",
      });
    }

    if ((pendingReceiptCount ?? 0) > 0) {
      alerts.push({
        kind: "teacher_period_pending_receipt",
        label: "Periodos docentes esperando recibo",
        detail: `${pendingReceiptCount} periodo(s) esperando que el docente suba su recibo`,
        href: "/admin/pagos-docentes",
      });
    }

    if ((awaitingPaymentCount ?? 0) > 0) {
      alerts.push({
        kind: "teacher_period_awaiting_payment",
        label: "Periodos docentes aprobados sin pagar",
        detail: `${awaitingPaymentCount} periodo(s) aprobado(s) pendiente(s) de pago`,
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

interface PeriodActivityRow {
  id: number;
  total_amount: number;
  paid_at: string | null;
  teacher: { profiles: { first_name: string; last_name: string } | null } | null;
}

/** Actividad reciente unificada: pagos de estudiantes completados + periodos docentes pagados. */
export async function getRecentActivity(supabase: Client): Promise<SectionResult<DashboardActivityItem[]>> {
  try {
    const [paymentsRes, periodsRes] = await Promise.all([
      supabase
        .from("student_payments")
        .select("id, amount, paid_at, created_at, student:profiles(first_name,last_name)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<PaymentActivityRow[]>(),
      supabase
        .from("teacher_payment_periods")
        .select(
          "id, total_amount, paid_at, teacher:teacher_profiles!teacher_payment_periods_teacher_id_fkey(profiles(first_name,last_name))"
        )
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(10)
        .returns<PeriodActivityRow[]>(),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (periodsRes.error) throw periodsRes.error;

    const paymentItems: DashboardActivityItem[] = paymentsRes.data.map((row) => ({
      kind: "student_payment_completed",
      id: row.id,
      personName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "Estudiante",
      amount: row.amount,
      occurredAt: row.paid_at ?? row.created_at,
    }));

    const periodItems: DashboardActivityItem[] = periodsRes.data
      .filter((row): row is PeriodActivityRow & { paid_at: string } => row.paid_at !== null)
      .map((row) => ({
        kind: "teacher_period_paid",
        id: row.id,
        personName: row.teacher?.profiles
          ? `${row.teacher.profiles.first_name} ${row.teacher.profiles.last_name}`
          : "Docente",
        amount: row.total_amount,
        occurredAt: row.paid_at,
      }));

    const merged = [...paymentItems, ...periodItems]
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

export async function getDashboardData(supabase: Client, now: Date = new Date()): Promise<DashboardData> {
  const todayRange = getTodayRangeInLima(now);

  const [kpis, classes, alerts, recentActivity, recentStudents] = await Promise.allSettled([
    getDashboardKpis(supabase, todayRange),
    getClassesToday(supabase, now),
    getDashboardAlerts(supabase, now),
    getRecentActivity(supabase),
    getRecentStudents(supabase),
  ]);

  function unwrap<T>(res: PromiseSettledResult<SectionResult<T>>): SectionResult<T> {
    return res.status === "fulfilled" ? res.value : errorSection(res.reason);
  }

  return {
    kpis: unwrap(kpis),
    classes: unwrap(classes),
    alerts: unwrap(alerts),
    recentActivity: unwrap(recentActivity),
    recentStudents: unwrap(recentStudents),
  };
}
