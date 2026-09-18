import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  USERS_PAGE_SIZE,
  type AccessStatus,
  type ProgramOption,
  type RoleChangeEntry,
  type UserDetail,
  type UserListFilters,
  type UserListItem,
  type UserListResult,
} from "./types";

type Client = SupabaseClient<Database>;

/**
 * must_change_password es la fuente de verdad para cuentas creadas por el flujo nuevo
 * (auth.admin.createUser() + contraseña temporal, 0014): mientras esté en true, el estudiante
 * nunca inició sesión con una contraseña propia. account_invitations sigue siendo la fuente de
 * verdad para cuentas del flujo viejo (auth.admin.inviteUserByEmail()) que ya tengan una fila --
 * el flujo nuevo no inserta filas ahí. Sin ninguna de las dos señales, no hay concepto de
 * "acceso pendiente" (auto-registro, o admin/teacher).
 */
function toAccessStatus(
  mustChangePassword: boolean,
  invitation: { accepted_at: string | null } | null
): AccessStatus | null {
  if (mustChangePassword) return "pending";
  if (invitation) return invitation.accepted_at ? "activated" : "pending";
  return null;
}

interface ProfileListRow {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  role: Database["public"]["Enums"]["user_role"];
  level: Database["public"]["Enums"]["academic_level"];
  status: string;
  must_change_password: boolean;
  created_at: string;
  archived_at: string | null;
  program: { name: string } | null;
  account_invitations: { accepted_at: string | null } | null;
  classrooms: { id: number; name: string; status: string }[] | null;
}

const LIST_SELECT =
  "id, first_name, last_name, dni, phone, role, level, status, must_change_password, created_at, archived_at, program:programs(name), account_invitations!account_invitations_profile_id_fkey(accepted_at), classrooms!classrooms_student_id_fkey(id, name, status)";

function mapListRow(row: ProfileListRow): UserListItem {
  const activeClassroom = row.classrooms?.find((c) => c.status === "active") ?? null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    phone: row.phone,
    role: row.role,
    level: row.level,
    status: row.status,
    programName: row.program?.name ?? null,
    accessStatus: toAccessStatus(row.must_change_password, row.account_invitations),
    createdAt: row.created_at,
    archivedAt: row.archived_at,
    classroom: activeClassroom ? { id: activeClassroom.id, name: activeClassroom.name } : null,
  };
}

/**
 * Búsqueda por nombre/apellido/DNI vía ilike -- nombres y DNI reales no llevan comas ni
 * paréntesis, así que no hace falta el escapado completo de la sintaxis .or() de
 * PostgREST para este caso de uso.
 */
export async function listUsers(supabase: Client, filters: UserListFilters): Promise<UserListResult> {
  const page = Math.max(1, filters.page);
  const from = (page - 1) * USERS_PAGE_SIZE;
  const to = from + USERS_PAGE_SIZE - 1;

  let query = supabase.from("profiles").select(LIST_SELECT, { count: "exact" });

  if (filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  const term = filters.search.trim();
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},dni.ilike.${pattern}`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<ProfileListRow[]>();

  if (error) throw error;

  return {
    items: data.map(mapListRow),
    totalCount: count ?? 0,
    page,
    pageSize: USERS_PAGE_SIZE,
  };
}

interface ProfileDetailRow {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  role: Database["public"]["Enums"]["user_role"];
  level: Database["public"]["Enums"]["academic_level"];
  status: string;
  must_change_password: boolean;
  program_id: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  program: { name: string } | null;
  teacher_profile: { hourly_rate: number; status: string; bio: string | null } | null;
  account_invitations: { accepted_at: string | null } | null;
}

const DETAIL_SELECT = `
  id, first_name, last_name, dni, phone, role, level, status, must_change_password, program_id, created_at, updated_at, archived_at,
  program:programs(name),
  teacher_profile:teacher_profiles!teacher_profiles_profile_id_fkey(hourly_rate, status, bio),
  account_invitations!account_invitations_profile_id_fkey(accepted_at)
`;

export async function getUserDetail(supabase: Client, id: string): Promise<UserDetail | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .returns<ProfileDetailRow | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    dni: data.dni,
    phone: data.phone,
    role: data.role,
    level: data.level,
    status: data.status,
    programId: data.program_id,
    programName: data.program?.name ?? null,
    accessStatus: toAccessStatus(data.must_change_password, data.account_invitations),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    teacherProfile: data.teacher_profile
      ? { hourlyRate: data.teacher_profile.hourly_rate, status: data.teacher_profile.status, bio: data.teacher_profile.bio }
      : null,
    archivedAt: data.archived_at,
  };
}

interface RoleChangeRow {
  id: number;
  previous_role: Database["public"]["Enums"]["user_role"];
  new_role: Database["public"]["Enums"]["user_role"];
  changed_at: string;
  changed_by_profile: { first_name: string; last_name: string } | null;
}

export async function getRoleChanges(supabase: Client, profileId: string): Promise<RoleChangeEntry[]> {
  const { data, error } = await supabase
    .from("role_changes")
    .select(
      "id, previous_role, new_role, changed_at, changed_by_profile:profiles!role_changes_changed_by_fkey(first_name,last_name)"
    )
    .eq("profile_id", profileId)
    .order("changed_at", { ascending: false })
    .returns<RoleChangeRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    previousRole: row.previous_role,
    newRole: row.new_role,
    changedAt: row.changed_at,
    changedByName: row.changed_by_profile
      ? `${row.changed_by_profile.first_name} ${row.changed_by_profile.last_name}`
      : "—",
  }));
}

/**
 * `activeOnly` por defecto en false: los formularios de EDICIÓN (UserEditForm) deben poder seguir
 * mostrando el programa ya asignado a alguien aunque se haya desactivado después -- si se
 * filtrara siempre, el <select> quedaría con un value que no está entre sus options y parecería
 * "sin programa" sin serlo. Los formularios de CREACIÓN (nuevo estudiante, nuevo salón) sí deben
 * pasar `activeOnly: true`: no tiene sentido ofrecer un programa desactivado para algo nuevo.
 */
export async function listPrograms(supabase: Client, options?: { activeOnly?: boolean }): Promise<ProgramOption[]> {
  let query = supabase.from("programs").select("id, name");
  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return data;
}
