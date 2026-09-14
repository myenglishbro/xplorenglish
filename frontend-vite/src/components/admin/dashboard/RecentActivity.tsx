import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { DashboardActivityItem } from "@/server/dashboard/types";

const CURRENCY = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

const KIND_LABEL: Record<DashboardActivityItem["kind"], string> = {
  student_payment_completed: "Pago de estudiante",
  teacher_period_paid: "Pago a docente",
};

export function RecentActivity({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="clock-counter-clockwise" title="Sin actividad reciente">
        Todavía no hay pagos completados ni periodos docentes pagados.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-accent-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
            }}
          >
            <Icon name={item.kind === "student_payment_completed" ? "credit-card" : "money"} size={16} color="var(--cyan-600)" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
              {item.personName}
            </div>
            <div style={{ font: "var(--weight-regular) 12px/1.3 var(--font-body)", color: "var(--text-muted)" }}>
              {KIND_LABEL[item.kind]} · {formatShortDateInLima(item.occurredAt)} {formatTimeInLima(item.occurredAt)}
            </div>
          </div>
          <div style={{ marginLeft: "auto", font: "var(--weight-bold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
            {CURRENCY.format(item.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
