import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AdminHourPackageListItem, AdminHoursMovementItem } from "./types";

type Client = SupabaseClient<Database>;

interface PackageRow {
  id: number;
  student_id: string;
  package_label: string;
  total_minutes: number;
  purchased_at: string;
  status: Database["public"]["Enums"]["package_status"];
  student: { first_name: string; last_name: string; dni: string } | null;
}

/**
 * TODOS los paquetes, de TODOS los estudiantes -- a diferencia de getStudentHoursPackages
 * (server/hours/queries.ts, sin parámetro porque depende de RLS scoping a "own"), acá el caller
 * es admin: hours_packages_select_own (0007) permite student_id=auth.uid() OR is_admin(), así que
 * un admin sin filtro ve todo. Volumen esperado bajo en este MVP (mismo criterio que
 * getAllClassSchedules) -- se trae todo y se filtra/busca en el cliente, sin paginación server-side.
 *
 * remainingMinutes: 2 round-trips fijos (paquetes + movimientos batch por .in()), igual patrón
 * exacto que getStudentHoursPackages -- nunca se toca esa fuente de verdad del saldo.
 * consumedMinutes: agregación adicional, solo informativa (ver types.ts).
 */
export async function listHourPackagesForAdmin(supabase: Client): Promise<AdminHourPackageListItem[]> {
  const { data: packages, error } = await supabase
    .from("hours_packages")
    .select("id, student_id, package_label, total_minutes, purchased_at, status, student:profiles!hours_packages_student_id_fkey(first_name,last_name,dni)")
    .order("purchased_at", { ascending: false })
    .returns<PackageRow[]>();

  if (error) throw error;
  if (packages.length === 0) return [];

  const packageIds = packages.map((p) => p.id);
  const { data: movements, error: movementsError } = await supabase
    .from("hours_movements")
    .select("package_id, movement_type, minutes_delta")
    .in("package_id", packageIds);

  if (movementsError) throw movementsError;

  const remainingByPackage = new Map<number, number>();
  const consumedByPackage = new Map<number, number>();
  for (const m of movements) {
    if (m.package_id === null) continue;
    remainingByPackage.set(m.package_id, (remainingByPackage.get(m.package_id) ?? 0) + m.minutes_delta);
    if (m.movement_type === "consumption") {
      consumedByPackage.set(m.package_id, (consumedByPackage.get(m.package_id) ?? 0) + Math.abs(m.minutes_delta));
    }
  }

  return packages.map((p) => ({
    id: p.id,
    studentId: p.student_id,
    studentFirstName: p.student?.first_name ?? "",
    studentLastName: p.student?.last_name ?? "",
    studentDni: p.student?.dni ?? "",
    packageLabel: p.package_label,
    totalMinutes: p.total_minutes,
    consumedMinutes: consumedByPackage.get(p.id) ?? 0,
    remainingMinutes: remainingByPackage.get(p.id) ?? 0,
    purchasedAt: p.purchased_at,
    status: p.status,
  }));
}

interface MovementRow {
  id: number;
  movement_type: Database["public"]["Enums"]["hours_movement_type"];
  minutes_delta: number;
  notes: string | null;
  created_at: string;
  created_by_profile: { first_name: string; last_name: string } | null;
  package: { package_label: string } | null;
}

/**
 * Ledger crudo de UN estudiante (todos sus paquetes) -- "Historial de movimientos" en el detalle
 * admin. hours_movements.student_id ya identifica al estudiante directamente (no hace falta pasar
 * por package_id), mismo criterio de acceso admin que listHourPackagesForAdmin
 * (hours_movements_select_own, 0007). Sin ninguna agregación ni interpretación: cada fila es un
 * hecho ya escrito por create_hour_package (compra) o register_class/correct_class (consumo).
 */
export async function listHoursMovementsForStudent(supabase: Client, studentId: string): Promise<AdminHoursMovementItem[]> {
  const { data, error } = await supabase
    .from("hours_movements")
    .select(
      `
      id, movement_type, minutes_delta, notes, created_at,
      created_by_profile:profiles!hours_movements_created_by_fkey(first_name,last_name),
      package:hours_packages(package_label)
    `
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .returns<MovementRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    movementType: row.movement_type,
    minutesDelta: row.minutes_delta,
    notes: row.notes,
    createdAt: row.created_at,
    createdByName: row.created_by_profile ? `${row.created_by_profile.first_name} ${row.created_by_profile.last_name}` : "—",
    packageLabel: row.package?.package_label ?? null,
  }));
}
