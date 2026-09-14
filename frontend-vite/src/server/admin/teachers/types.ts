// teacher_profiles.status es `text` con CHECK (0003_identity.sql), no un enum real de Postgres --
// mismo criterio que ProfileStatus en server/admin/users/types.ts.
export type TeacherProfileStatus = "active" | "inactive";

export interface TeacherListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (Design System) -- mismo
  // criterio que UserListItem/ClassroomListItem.
  [key: string]: unknown;
  id: string;
  firstName: string;
  lastName: string;
  /** null si auth.admin.listUsers() no devolvió este id en su página (ver listTeachers). */
  email: string | null;
  phone: string;
  hourlyRate: number;
  /** teacher_profiles.status -- "¿está operativo como docente?" (lo que de verdad gatea
   * start_session/asignaciones). Distinto de accountStatus. */
  teacherStatus: TeacherProfileStatus;
  /** profiles.status -- "¿la cuenta en general está activa?" (login, visibilidad en /admin/usuarios).
   * Se muestra en el detalle, no en el listado (ver decisión en admin/docentes/page.tsx). */
  accountStatus: string;
  activeClassroomCount: number;
}
