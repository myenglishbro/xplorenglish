import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { MyStudentProfile } from "./types";

type Client = SupabaseClient<Database>;

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  level: Database["public"]["Enums"]["academic_level"];
  status: string;
  program: { name: string } | null;
}

const SELECT = "id, first_name, last_name, dni, phone, level, status, program:programs(name)";

/**
 * profileId siempre viene de auth.getUser() en el caller (page.tsx vía getAuthUser()), nunca de
 * un parámetro público -- RLS (profiles_select, 0003) ya lo acotaría de todos modos a la fila
 * propia, pero esta query no depende solo de eso. El email NO se resuelve acá: vive en
 * auth.users, no en profiles, y el caller ya lo tiene gratis vía el mismo getAuthUser().email.
 */
export async function getMyStudentProfile(supabase: Client, profileId: string): Promise<MyStudentProfile | null> {
  const { data, error } = await supabase.from("profiles").select(SELECT).eq("id", profileId).maybeSingle().returns<Row | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    dni: data.dni,
    phone: data.phone,
    level: data.level,
    status: data.status,
    programName: data.program?.name ?? null,
  };
}
