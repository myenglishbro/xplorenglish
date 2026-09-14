import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { SessionConflict, SessionConflictReason } from "./types";

type Client = SupabaseClient<Database>;

interface OverlapRow {
  id: number;
  classroom_id: number;
  scheduled_teacher_id: string;
  scheduled_start: string;
  scheduled_end: string;
  classroom: { name: string } | null;
  scheduled_teacher: { profiles: { first_name: string; last_name: string } | null } | null;
}

const OVERLAP_SELECT = `
  id, classroom_id, scheduled_teacher_id, scheduled_start, scheduled_end,
  classroom:classrooms(name),
  scheduled_teacher:teacher_profiles!sessions_scheduled_teacher_id_fkey(profiles(first_name,last_name))
`;

/**
 * Detección de solapamiento BEST-EFFORT, exclusivamente para UX (mostrar el conflicto antes de
 * que el admin/docente confirme). Solo cuentan como "bloquean horario" las sesiones
 * `status='scheduled'` -- completadas/canceladas/reprogramadas nunca generan conflicto, ya no
 * ocupan ese horario en la práctica.
 *
 * ESTO NO ES UNA GARANTÍA DE INTEGRIDAD. No hay ningún constraint de exclusión a nivel de motor
 * (auditado explícitamente: no existe en 0006 ni en ningún otro archivo de `supabase/migrations`)
 * -- dos admins operando en paralelo, o dos llamadas casi simultáneas, pueden crear sesiones
 * solapadas de todas formas; esta función solo reduce la probabilidad de que ocurra por accidente
 * en el flujo normal de un solo operador. Una migración futura con `EXCLUDE USING gist` sobre
 * `tstzrange(scheduled_start, scheduled_end)` quedó identificada en la auditoría previa como el
 * arreglo real, deliberadamente fuera de alcance de este bloque.
 */
export async function findOverlappingSessions(
  supabase: Client,
  params: { classroomId: number; teacherId: string; start: Date; end: Date; excludeSessionId?: number }
): Promise<SessionConflict[]> {
  let query = supabase
    .from("sessions")
    .select(OVERLAP_SELECT)
    .eq("status", "scheduled")
    .lt("scheduled_start", params.end.toISOString())
    .gt("scheduled_end", params.start.toISOString())
    .or(`classroom_id.eq.${params.classroomId},scheduled_teacher_id.eq.${params.teacherId}`);

  if (params.excludeSessionId) {
    query = query.neq("id", params.excludeSessionId);
  }

  const { data, error } = await query.returns<OverlapRow[]>();
  if (error) throw error;

  return data.map((row) => {
    const matchesClassroom = row.classroom_id === params.classroomId;
    const matchesTeacher = row.scheduled_teacher_id === params.teacherId;
    const reason: SessionConflictReason = matchesClassroom && matchesTeacher ? "both" : matchesClassroom ? "classroom" : "teacher";
    const teacherProfile = row.scheduled_teacher?.profiles;
    return {
      sessionId: row.id,
      reason,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      classroomName: row.classroom?.name ?? "Salón",
      teacherName: teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : "Docente",
    };
  });
}

export function describeConflicts(conflicts: SessionConflict[]): string {
  const classroomConflict = conflicts.find((c) => c.reason === "classroom" || c.reason === "both");
  const teacherConflict = conflicts.find((c) => c.reason === "teacher" || c.reason === "both");

  const parts: string[] = [];
  if (classroomConflict) {
    parts.push(`el salón "${classroomConflict.classroomName}" ya tiene una sesión programada en ese horario`);
  }
  if (teacherConflict) {
    parts.push(`el docente ${teacherConflict.teacherName} ya tiene una clase programada en ese horario`);
  }
  return parts.length > 0 ? `Conflicto de horario: ${parts.join("; ")}.` : "Conflicto de horario.";
}
