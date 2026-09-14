import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ProgramListItem } from "./types";

type Client = SupabaseClient<Database>;

/** Todos los programas (activos e inactivos) -- vista de administración, a diferencia de
 * listPrograms() en server/admin/users/queries.ts, que es para selectores de formulario. */
export async function listProgramsForAdmin(supabase: Client): Promise<ProgramListItem[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, description, is_active, created_at")
    .order("name", { ascending: true });

  if (error) throw error;

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isActive: p.is_active,
    createdAt: p.created_at,
  }));
}
