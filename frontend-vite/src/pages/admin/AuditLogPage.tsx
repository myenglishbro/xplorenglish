import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatLongDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { useAuditLogs } from "@/features/auditLogs/hooks";
import type { AuditLogItem } from "@/server/auditLogs/types";

const ACTION_LABEL: Record<string, string> = {
  USER_ARCHIVED: "Usuario archivado",
  USER_RESTORED: "Usuario restaurado",
  HOURS_PACKAGE_CANCELLED: "Paquete cancelado",
  HOURS_PACKAGE_REFUNDED: "Paquete reembolsado",
  STUDENT_PAYMENT_REFUNDED: "Pago reembolsado",
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  profile: "Usuario",
  hours_package: "Paquete de horas",
  student_payment: "Pago de estudiante",
};

/**
 * Administración -> Auditoría (ciclo de vida de datos, versión reducida) -- vista mínima de solo
 * lectura sobre audit_logs (append-only, RLS admin-only). Sin filtros, sin exportación, sin
 * dashboard: exactamente lo pedido, últimos 200 registros.
 */
export function AuditLogPage() {
  const { data, isLoading, isError } = useAuditLogs();

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: "createdAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatLongDateInLima(new Date(row.createdAt))} · {formatTimeInLima(row.createdAt)}
        </span>
      ),
    },
    { key: "adminName", header: "Administrador" },
    { key: "action", header: "Acción", render: (row) => ACTION_LABEL[row.action] ?? row.action },
    {
      key: "entityType",
      header: "Entidad",
      render: (row) => `${ENTITY_TYPE_LABEL[row.entityType] ?? row.entityType} #${row.entityId}`,
    },
    { key: "reason", header: "Motivo", render: (row) => row.reason ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Auditoría
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Registro de acciones administrativas sensibles (últimos 200).</p>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : isError || !data ? (
        <Alert tone="danger">No pudimos cargar la auditoría. Recarga la página para intentarlo de nuevo.</Alert>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState icon="clock-counter-clockwise" title="Sin registros todavía">
            Las acciones administrativas sensibles (archivar usuario, cancelar/reembolsar paquete, etc.) aparecerán acá.
          </EmptyState>
        </Card>
      ) : (
        <Card pad={false}>
          <DataTable columns={columns} rows={data} dense />
        </Card>
      )}
    </div>
  );
}
