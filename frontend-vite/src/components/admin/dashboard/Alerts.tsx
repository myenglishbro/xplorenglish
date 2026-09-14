import { Link } from "react-router-dom";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import type { DashboardAlert } from "@/server/dashboard/types";

export function Alerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState icon="check-circle" title="Todo en orden">
        No hay alertas pendientes en este momento.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {alerts.map((alert) => (
        <Alert
          key={alert.kind}
          tone="warning"
          title={alert.label}
          action={
            <Link to={alert.href} style={{ font: "var(--weight-bold) 12.5px/1 var(--font-body)", color: "var(--text-body)" }}>
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
