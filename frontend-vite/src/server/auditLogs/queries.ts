import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AuditLogItem } from "./types";

type Client = SupabaseClient<Database>;

interface AuditLogRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  created_at: string;
  admin: { first_name: string; last_name: string } | null;
}

/** Vista mínima, sin filtros (ciclo de vida de datos, versión reducida) -- RLS
 * (audit_logs_admin_select) ya acota a admin; últimos 200 registros, más recientes primero. */
export async function listAuditLogs(supabase: Client): Promise<AuditLogItem[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      id, action, entity_type, entity_id, reason, created_at,
      admin:profiles!audit_logs_admin_user_id_fkey(first_name, last_name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditLogRow[]>();

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    adminName: row.admin ? `${row.admin.first_name} ${row.admin.last_name}` : "—",
    createdAt: row.created_at,
  }));
}
