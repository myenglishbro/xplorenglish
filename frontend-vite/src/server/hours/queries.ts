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
 * `hours_movements.minutes_delta` por paquete -- dato histórico POR PAQUETE, nunca el saldo
 * operativo del estudiante (ver getStudentTotalBalance/useStudentBalance más abajo, única fuente
 * real). `hours_packages.total_minutes` NUNCA se usa como saldo, solo como el monto originalmente
 * comprado. Sin FIFO: register_class/correct_class (consumo real) siempre escriben
 * `package_id=NULL` -- por eso `remainingMinutes` casi nunca baja por clases dictadas, solo por
 * movimientos atados explícitamente a ese paquete (refund/adjustment/expiration).
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

/**
 * Saldo TOTAL del estudiante autenticado (todos sus salones/paquetes), la única fuente de verdad
 * real: `SUM(hours_movements.minutes_delta)` sobre el ledger completo -- nunca una suma de
 * `remainingMinutes` por paquete (eso es lo que causaba que el dashboard mostrara un saldo
 * desactualizado tras registrar una clase, ya que los consumos de register_class/correct_class
 * nacen con package_id=NULL y getStudentHoursPackages nunca los contaba). RLS
 * `hours_movements_select_own` ya acota a las filas propias, igual criterio que el resto de este
 * archivo.
 */
export async function getStudentTotalBalance(supabase: Client): Promise<number> {
  const { data, error } = await supabase.from("hours_movements").select("minutes_delta");
  if (error) throw error;
  return data.reduce((sum, row) => sum + row.minutes_delta, 0);
}

interface AttendanceHistoryRow {
  id: number;
  occurred_at: string;
  status: Database["public"]["Enums"]["class_record_status"];
  minutes: number;
  classroom: { name: string } | null;
}

/** Fuente única class_records (Slice A/F) -- reemplaza session_attendance/sessions. Filtra por
 * student_id explícito (RLS class_records_select ya lo acota igual, pero el filtro evita traer de
 * más si el caller alguna vez deja de ser exclusivamente "mis propias clases"). */
export async function getStudentAttendanceHistory(supabase: Client, studentId: string): Promise<StudentAttendanceHistoryItem[]> {
  const { data, error } = await supabase
    .from("class_records")
    .select("id, occurred_at, status, minutes, classroom:classrooms(name)")
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
    .returns<AttendanceHistoryRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    classRecordId: row.id,
    classroomName: row.classroom?.name ?? "Salón sin nombre",
    occurredAt: row.occurred_at,
    status: row.status,
    minutes: row.minutes,
  }));
}

/**
 * Pura, sin acceso a datos -- separada de getStudentHoursSummary para que una página que ya
 * cargó los paquetes y el saldo (ej. para la tabla "Mis paquetes") pueda derivar el resumen sin
 * pagar una segunda vuelta idéntica. `availableMinutes` SIEMPRE viene de afuera (el saldo real del
 * ledger, ver getStudentTotalBalance) -- esta función nunca lo recalcula sumando paquetes, para que
 * no puedan existir dos cálculos de saldo divergentes en la app.
 */
export function summarizeHoursPackages(packages: HoursPackageItem[], availableMinutes: number): StudentHoursSummary {
  return {
    availableMinutes,
    activePackages: packages.filter((p) => p.status === "active").length,
    exhaustedPackages: packages.filter((p) => p.status === "exhausted").length,
    expiredPackages: packages.filter((p) => p.status === "expired").length,
  };
}

/** Combina paquetes (para los conteos) + saldo real del ledger (para availableMinutes) en un solo
 * resumen -- pensado para un caller que necesita SOLO el resumen sin manejar ambas queries por su
 * cuenta. */
export async function getStudentHoursSummary(supabase: Client): Promise<StudentHoursSummary> {
  const [packages, availableMinutes] = await Promise.all([getStudentHoursPackages(supabase), getStudentTotalBalance(supabase)]);
  return summarizeHoursPackages(packages, availableMinutes);
}
