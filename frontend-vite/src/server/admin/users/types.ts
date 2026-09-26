import type { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type AcademicLevel = Database["public"]["Enums"]["academic_level"];

// profiles.status es `text` con CHECK (0003_identity.sql), no un enum real de Postgres --
// este union es la representación de aplicación de esos dos valores permitidos.
export type ProfileStatus = "active" | "inactive";

// Estado de acceso del estudiante -- deliberadamente distinto de ProfileStatus: "activo/inactivo"
// es un criterio de negocio que decide el admin; "pendiente/activado" es si el usuario ya
// terminó de configurar su propia contraseña. Se deriva de profiles.must_change_password (0014,
// flujo actual: auth.admin.createUser() + contraseña temporal) o, si no aplica, de
// public.account_invitations (0013, flujo viejo: auth.admin.inviteUserByEmail()) -- ver
// toAccessStatus() en ./queries.ts. null significa que ninguna señal aplica (auto-registro,
// admin, teacher).
export type AccessStatus = "pending" | "activated";

export const ACADEMIC_LEVELS: AcademicLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const USERS_PAGE_SIZE = 20;

export interface UserListFilters {
  search: string;
  role: UserRole | "all";
  status: ProfileStatus | "all";
  page: number;
}

export interface UserListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (componente
  // genérico del Design System); no relaja el tipado de los accesos nombrados abajo.
  [key: string]: unknown;
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  role: UserRole;
  level: AcademicLevel;
  status: string;
  programName: string | null;
  accessStatus: AccessStatus | null;
  createdAt: string;
  /** No operativo, pero conserva todo su historial -- ver admin_archive_user/admin_restore_user.
   * Independiente de `status`: un usuario archivado puede tener status='active' o 'inactive'. */
  archivedAt: string | null;
  /** Solo aplica a role="student". Salón activo (classroom_students.status='active' +
   * classrooms.status='active'), o null si no tiene ninguno asignado. */
  classroom: { id: number; name: string } | null;
  /** Solo aplica a role="student" (FIX 9, segunda etapa) -- null para los demás roles.
   * SUM(hours_packages.total_minutes) WHERE status NOT IN ('cancelled','refunded'): histórico
   * válido de minutos comprados, NUNCA el saldo actual. 0 si nunca compró un paquete. */
  hoursPurchasedMinutes: number | null;
  /** Solo aplica a role="student" -- null para los demás roles. SUM(hours_movements.minutes_delta),
   * la misma fuente de verdad del saldo que usa el resto de la app (nunca recalculado desde
   * hoursPurchasedMinutes - consumo). */
  hoursBalanceMinutes: number | null;
}

export interface UserListResult {
  items: UserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ProgramOption {
  id: number;
  name: string;
}

export interface TeacherProfileSummary {
  hourlyRate: number;
  status: string;
  bio: string | null;
  /** Enlace a la carpeta de Google Drive del docente para recibos por honorarios (FIX 2, segunda
   * etapa) -- null si Admin todavía no la configuró. Xplore solo almacena y abre esta URL. */
  receiptDriveUrl: string | null;
}

export interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  role: UserRole;
  level: AcademicLevel;
  status: string;
  programId: number | null;
  programName: string | null;
  accessStatus: AccessStatus | null;
  createdAt: string;
  updatedAt: string;
  teacherProfile: TeacherProfileSummary | null;
  archivedAt: string | null;
}

export interface RoleChangeEntry {
  id: number;
  previousRole: UserRole;
  newRole: UserRole;
  changedAt: string;
  changedByName: string;
}
