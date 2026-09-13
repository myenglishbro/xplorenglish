import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { HoursPackageItem, StudentAttendanceHistoryItem, StudentHoursSummary } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Nunca se recibe ni se filtra por un `studentId` explícito -- RLS (`hours_packages_select_own`,
 * `hours_movements_select_own`, `session_attendance_select`, 0006/0007) ya acota cada una de
 * estas queries a las filas del usuario autenticado (`auth.uid()`), igual criterio que
 * `getRoleSessions` en `server/scheduling/queries.ts`. No hay ningún parámetro público que un
 * cliente pudiera manipular para ver datos de otro estudiante.
 */

/**
 * getStudentHoursPackages: `remainingMinutes` se calcula acá, en el servidor, sumando
 * `hours_movements.minutes_delta` por paquete -- el ledger es la única fuente de verdad del
 * saldo (ver DOMAIN_FUNCTIONS_API.md). `hours_packages.total_minutes` NUNCA se usa como saldo,
 * solo como el monto originalmente comprado. No se duplica ninguna lógica de FIFO/consumo: esto
 * es una suma de hechos ya registrados, no una decisión de a qué paquete cargar un consumo (eso
 * sigue siendo exclusivo de `set_student_session_billing`).
 */
export async function getStudentHoursPackages(supabase: Client): Promise<HoursPackageItem[]> {
  const { data: packages, error: packagesError } = await supabase
    .from("hours_packages")
    .select("id, package_label, total_minutes, purchased_at, expires_at, status")
    .order("purchased_at", { ascending: false });

  if (packagesError) throw packagesError;
  if (packages.length === 0) return [];

  const packageIds = packages.map((p) => p.id);
  const { data: movements, error: movementsError } = await supabase
    .from("hours_movements")
    .select("package_id, minutes_delta")
    .in("package_id", packageIds);

  if (movementsError) throw movementsError;

  const remainingByPackage = new Map<number, number>();
  for (const movement of movements) {
    if (movement.package_id === null) continue;
    remainingByPackage.set(movement.package_id, (remainingByPackage.get(movement.package_id) ?? 0) + movement.minutes_delta);
  }

  return packages.map((p) => ({
    id: p.id,
    packageLabel: p.package_label,
    totalMinutes: p.total_minutes,
    remainingMinutes: remainingByPackage.get(p.id) ?? 0,
    purchasedAt: p.purchased_at,
    expiresAt: p.expires_at,
    status: p.status,
  }));
}

interface AttendanceHistoryRow {
  id: number;
  session_id: number;
  status: Database["public"]["Enums"]["attendance_status"];
  minutes_charged: number | null;
  session: { scheduled_start: string; scheduled_end: string; classroom: { name: string } | null } | null;
}

/** session_attendance.session_id -> sessions(id) -> sessions.classroom_id -> classrooms(id) son
 * dos FK directas encadenadas (no el caso de dos saltos vía teacher_profiles) -- el embed anidado
 * es válido, mismo patrón ya usado en dashboard/queries.ts para scheduled_teacher/actual_teacher. */
export async function getStudentAttendanceHistory(supabase: Client): Promise<StudentAttendanceHistoryItem[]> {
  const { data, error } = await supabase
    .from("session_attendance")
    .select(
      `
      id, session_id, status, minutes_charged,
      session:sessions(scheduled_start, scheduled_end, classroom:classrooms(name))
    `
    )
    .returns<AttendanceHistoryRow[]>();

  if (error) throw error;

  return data
    .filter((row): row is AttendanceHistoryRow & { session: NonNullable<AttendanceHistoryRow["session"]> } => row.session !== null)
    .map((row) => ({
      attendanceId: row.id,
      sessionId: row.session_id,
      classroomName: row.session.classroom?.name ?? "Salón sin nombre",
      scheduledStart: row.session.scheduled_start,
      scheduledEnd: row.session.scheduled_end,
      status: row.status,
      minutesCharged: row.minutes_charged,
    }))
    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
}

/**
 * Pura, sin acceso a datos -- separada de getStudentHoursSummary para que una página que ya
 * cargó los paquetes (ej. para la tabla "Mis paquetes") pueda derivar el resumen sin pagar una
 * segunda vuelta idéntica a hours_packages/hours_movements. Ninguna lógica de FIFO/consumo acá,
 * solo agregación de lo que getStudentHoursPackages ya calculó.
 */
export function summarizeHoursPackages(packages: HoursPackageItem[]): StudentHoursSummary {
  const activePackages = packages.filter((p) => p.status === "active");

  return {
    // Math.max(...,0) es un guardado puramente de presentación (un paquete 'active' con saldo <=0
    // sería una anomalía de datos, no algo que esta pantalla de solo lectura deba decidir o
    // corregir) -- nunca escribe ni ajusta nada.
    availableMinutes: activePackages.reduce((sum, p) => sum + Math.max(p.remainingMinutes, 0), 0),
    activePackages: activePackages.length,
    exhaustedPackages: packages.filter((p) => p.status === "exhausted").length,
    expiredPackages: packages.filter((p) => p.status === "expired").length,
  };
}

/** Reutiliza getStudentHoursPackages en vez de volver a sumar el ledger por su cuenta -- una sola
 * implementación de "sumar hours_movements", nunca dos copias que puedan divergir. Pensada para
 * un caller que necesita SOLO el resumen (ej. un futuro widget); la página /student/horas usa
 * summarizeHoursPackages directamente sobre los paquetes que ya cargó, para no duplicar la query. */
export async function getStudentHoursSummary(supabase: Client): Promise<StudentHoursSummary> {
  const packages = await getStudentHoursPackages(supabase);
  return summarizeHoursPackages(packages);
}
