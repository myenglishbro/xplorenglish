import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ClassRecordHistoryItem, CorrectClassInput, RegisterClassInput, RegisterClassResult } from "./types";

type Client = SupabaseClient<Database>;

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "Esta operación es exclusiva para docentes.",
  TEACHER_INACTIVE: "Tu perfil docente está inactivo; contacta a un administrador para reactivarlo.",
  MISSING_IDEMPOTENCY_KEY: "Falta un identificador de la operación. Recarga e inténtalo de nuevo.",
  IDEMPOTENCY_KEY_CONFLICT: "Esta operación ya fue registrada de otra forma. Recarga e inténtalo de nuevo.",
  CLASSROOM_NOT_FOUND: "Ese salón no existe.",
  TEACHER_NOT_ENABLED: "No estás habilitado para registrar clases en este salón.",
  NO_STUDENT_ASSIGNED: "Este salón todavía no tiene un alumno asignado.",
  INVALID_STUDENT: "El alumno asignado a este salón no está activo.",
  INVALID_MINUTES: "Los minutos ingresados no son válidos para este estado.",
  MISSING_HOURLY_RATE: "Tu perfil docente no tiene una tarifa configurada.",
  INSUFFICIENT_BALANCE: "El alumno no tiene saldo suficiente para esta clase.",
  INVALID_INPUT: "Faltan datos para completar la corrección.",
  CLASS_RECORD_NOT_FOUND: "Esa clase no existe.",
  CLASS_RECORD_PAID: "Esta clase ya fue pagada; solo puedes editar la observación.",
};

function parseRpcError(error: { message: string }): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(RPC_ERROR_MESSAGES[code] ?? "No pudimos registrar la clase. Inténtalo de nuevo en unos minutos.");
}

// El generador de tipos de Supabase no marca como nullable las columnas de un RETURNS TABLE que
// en la práctica sí pueden venir null (hourly_rate_snapshot/amount/teacher_payment_id en
// REPROGRAMADA) -- se corrige acá, en el límite, en vez de confiar en el tipo generado tal cual.
type RegisterClassRow = Database["public"]["Functions"]["register_class"]["Returns"][number];

function mapRow(row: RegisterClassRow): RegisterClassResult {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    occurredAt: row.occurred_at,
    status: row.status,
    minutes: row.minutes,
    notes: row.notes,
    hourlyRateSnapshot: row.hourly_rate_snapshot,
    amount: row.amount,
    teacherPaymentId: row.teacher_payment_id,
    studentBalance: row.student_balance,
  };
}

/**
 * Único punto de escritura para clases nuevas (Slice B). teacher_id NUNCA viaja desde el cliente
 * -- register_class lo resuelve de auth.uid() dentro de la DB (private.require_active_teacher) y
 * valida que el docente esté habilitado en classroom_teachers para este salón. idempotencyKey debe
 * generarse una sola vez por intento de registro (crypto.randomUUID(), mismo criterio que
 * useCreateHourPackage) y reutilizarse en reintentos manuales del mismo intento.
 */
export async function registerClass(supabase: Client, input: RegisterClassInput): Promise<RegisterClassResult> {
  const { data, error } = await supabase
    .rpc("register_class", {
      p_classroom_id: input.classroomId,
      p_occurred_at: input.occurredAt,
      p_status: input.status,
      p_minutes: input.minutes,
      // El generador tipa p_notes como `string` no-nullable aunque la columna sí admite null;
      // Postgres acepta null para un parámetro `text` sin NOT NULL sin problema en runtime.
      p_notes: input.notes as string,
      p_idempotency_key: input.idempotencyKey,
    })
    .single();

  if (error) throw parseRpcError(error);
  return mapRow(data as RegisterClassRow);
}

// Misma forma que RegisterClassRow (ver nota arriba) -- correct_class devuelve exactamente las
// mismas columnas.
type CorrectClassRow = Database["public"]["Functions"]["correct_class"]["Returns"][number];

/**
 * Corrige una clase ya registrada (Slice C). Solo el profesor que la registró originalmente puede
 * corregirla (class_records.teacher_id = auth.uid()), sin exigir que siga habilitado en el salón.
 * Si la clase ya está pagada, correct_class en la DB solo permite cambiar notes -- el frontend no
 * necesita replicar esa regla, el RPC la aplica y rechaza con CLASS_RECORD_PAID si corresponde.
 */
export async function correctClass(supabase: Client, input: CorrectClassInput): Promise<RegisterClassResult> {
  const { data, error } = await supabase
    .rpc("correct_class", {
      p_class_record_id: input.classRecordId,
      p_status: input.status,
      p_minutes: input.minutes,
      p_notes: input.notes as string,
    })
    .single();

  if (error) throw parseRpcError(error);
  return mapRow(data as CorrectClassRow);
}

interface HistoryRawRow {
  id: number;
  occurred_at: string;
  status: RegisterClassResult["status"];
  minutes: number;
  notes: string | null;
  teacher_id: string;
  teacher_payment_id: number | null;
  hourly_rate_snapshot: number | null;
  amount: number | null;
  teacher: { profile: { first_name: string; last_name: string } | null } | null;
}

/**
 * Historial de un salón (Slice F), más reciente arriba. El nombre del profesor viaja con la fila
 * (class_records.teacher_id -> teacher_profiles -> profiles, embed de dos saltos igual que en
 * server/admin/classrooms/queries.ts) -- NUNCA se resuelve contra classroom_teachers, así que un
 * profesor retirado del salón sigue apareciendo correctamente en clases pasadas.
 */
export async function getClassroomHistory(supabase: Client, classroomId: number): Promise<ClassRecordHistoryItem[]> {
  const { data, error } = await supabase
    .from("class_records")
    .select(
      `
      id, occurred_at, status, minutes, notes, teacher_id, teacher_payment_id, hourly_rate_snapshot, amount,
      teacher:teacher_profiles!class_records_teacher_id_fkey(profile:profiles!teacher_profiles_profile_id_fkey(first_name, last_name))
    `,
    )
    .eq("classroom_id", classroomId)
    .order("occurred_at", { ascending: false })
    .returns<HistoryRawRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    status: row.status,
    minutes: row.minutes,
    notes: row.notes,
    teacherId: row.teacher_id,
    teacherName: row.teacher?.profile ? `${row.teacher.profile.first_name} ${row.teacher.profile.last_name}` : "Profesor",
    teacherPaymentId: row.teacher_payment_id,
    hourlyRateSnapshot: row.hourly_rate_snapshot,
    amount: row.amount,
  }));
}

/** get_classroom_student_balance (Slice F) -- único camino para que un profesor habilitado vea el
 * saldo del alumno (hours_movements_select_own, 0003, solo permite al propio alumno o admin leer
 * la tabla directamente). null si el salón no tiene alumno asignado. */
export async function getClassroomBalance(supabase: Client, classroomId: number): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_classroom_student_balance", { p_classroom_id: classroomId });
  if (error) throw error;
  return data;
}
