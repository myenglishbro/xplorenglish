import { Link } from "react-router-dom";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tag } from "@/components/ui/core/Tag";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import type { StudentBalanceAlertItem } from "@/server/balanceAlerts/types";
import type { DashboardAlert } from "@/server/dashboard/types";

const LINK_STYLE = { font: "var(--weight-bold) 12.5px/1 var(--font-body)", color: "var(--text-body)" } as const;

/**
 * Panel único y compacto del Dashboard Admin -- combina las alertas de saldo (Slice G,
 * get_student_balance_alerts, ya viene ordenada SIN SALDO antes que SALDO BAJO) con las alertas
 * operativas existentes (salones sin profesor, clases pendientes de pago), en ese orden de
 * prioridad. Nunca una pared de mensajes: filas compactas, no una tabla ancha como
 * BalanceAlertsSection (pensada para una columna de 1/3 del dashboard, no para una página completa).
 */
export function OperationalAlertsPanel({
  balanceAlerts,
  operationalAlerts,
}: {
  balanceAlerts: StudentBalanceAlertItem[];
  operationalAlerts: DashboardAlert[];
}) {
  if (balanceAlerts.length === 0 && operationalAlerts.length === 0) {
    return (
      <EmptyState icon="check-circle" title="Todo en orden">
        No hay alertas pendientes en este momento.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {balanceAlerts.map((item) => {
        const balanceStatus = getStudentBalanceStatus(item.balance);
        return (
          <div
            key={item.studentId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-2)",
              padding: "8px 10px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.2 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.studentName}
              </span>
              <span style={{ font: "var(--weight-regular) 11.5px/1.2 var(--font-body)", color: "var(--text-muted)" }}>{item.balance} min</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
              <Tag tone={balanceStatus.tone} size="sm">
                {balanceStatus.label}
              </Tag>
              {item.classroomId ? (
                <Link to={`/admin/salones/${item.classroomId}`} style={LINK_STYLE}>
                  Ver salón →
                </Link>
              ) : (
                <Link to={`/admin/paquetes/${item.studentId}`} style={LINK_STYLE}>
                  Ver estudiante →
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {operationalAlerts.map((alert) => (
        <Alert
          key={alert.kind}
          tone="warning"
          title={alert.label}
          action={
            <Link to={alert.href} style={LINK_STYLE}>
              Ver detalle →
            </Link>
          }
        >
          {alert.detail}
        </Alert>
      ))}
    </div>
  );
}
