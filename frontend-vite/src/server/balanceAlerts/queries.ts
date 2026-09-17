import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { StudentBalanceAlertItem } from "./types";

type Client = SupabaseClient<Database>;

/**
 * get_student_balance_alerts (Slice G) -- un solo round-trip agregado, sin N+1. La RPC ya filtra a
 * SIN SALDO/SALDO BAJO y acota por permisos (Admin: todos los estudiantes activos; Teacher: solo
 * estudiantes de sus classroom_teachers activos). Un caller sin ninguno de esos roles recibe
 * NOT_AUTHORIZED -- no se llama desde Student (ver features/hours/hooks.ts, useStudentBalance).
 */
export async function getStudentBalanceAlerts(supabase: Client): Promise<StudentBalanceAlertItem[]> {
  const { data, error } = await supabase.rpc("get_student_balance_alerts");
  if (error) throw error;

  return data.map((row) => ({
    studentId: row.student_id,
    studentName: `${row.first_name} ${row.last_name}`,
    balance: row.balance,
    classroomId: row.classroom_id,
    classroomName: row.classroom_name,
  }));
}
