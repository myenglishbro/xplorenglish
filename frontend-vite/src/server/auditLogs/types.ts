/** Vista mínima de auditoría (Administración -> Auditoría) -- solo lectura, sin filtros. */
export interface AuditLogItem {
  [key: string]: unknown;
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  adminName: string;
  createdAt: string;
}
