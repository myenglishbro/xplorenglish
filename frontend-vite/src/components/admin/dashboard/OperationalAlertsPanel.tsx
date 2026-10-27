import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { classifyStudentBalance } from "@/lib/hours/balanceStatus";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { StudentBalanceAlertItem } from "@/server/balanceAlerts/types";
import type { DashboardAlert } from "@/server/dashboard/types";

const VISIBLE_ROWS = 5;
const LINK_STYLE = { font: "var(--weight-bold) 12.5px/1 var(--font-body)", color: "var(--text-body)", whiteSpace: "nowrap" } as const;
const ELLIPSIS = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

type TabKey = "empty" | "low" | "operational";

function Row({ accent, icon, title, subtitle, trailing, to, linkLabel }: { accent: string; icon: string; title: string; subtitle?: string | null; trailing?: string; to: string; linkLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "8px 4px", borderBottom: "1px solid var(--border-subtle)" }}>
      <span
        aria-hidden
        style={{ width: 30, height: 30, borderRadius: "50%", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
      >
        <Icon name={icon} size={16} color={accent} />
      </span>
      <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.2 var(--font-body)", color: "var(--text-heading)", ...ELLIPSIS }}>{title}</span>
        {subtitle && <span style={{ font: "var(--weight-regular) 12px/1.2 var(--font-body)", color: "var(--text-muted)", ...ELLIPSIS }}>{subtitle}</span>}
      </div>
      {trailing && <span style={{ font: "var(--weight-bold) 12px/1 var(--font-body)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{trailing}</span>}
      <Link to={to} style={{ ...LINK_STYLE, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {linkLabel}
        <Icon name="caret-right" weight="bold" size={12} />
      </Link>
    </div>
  );
}

/**
 * Panel de alertas del Dashboard Admin, compacto: pestañas con contador (Sin saldo / Saldo bajo /
 * Operativas), una lista a la vez, filas de una línea y "Ver todos" para pasar de las primeras filas.
 * La lista de saldo ya excluye estudiantes archivados (get_student_balance_alerts, 0054).
 */
export function OperationalAlertsPanel({
  balanceAlerts,
  operationalAlerts,
}: {
  balanceAlerts: StudentBalanceAlertItem[];
  operationalAlerts: DashboardAlert[];
}) {
  const empty = balanceAlerts.filter((i) => classifyStudentBalance(i.balance) === "empty");
  const low = balanceAlerts.filter((i) => classifyStudentBalance(i.balance) === "low");

  const tabs: { key: TabKey; label: string; count: number; color: string; icon: string }[] = [
    { key: "empty", label: "Sin saldo", count: empty.length, color: "var(--danger-solid)", icon: "battery-empty" },
    { key: "low", label: "Saldo bajo", count: low.length, color: "var(--warning-fg)", icon: "battery-low" },
    { key: "operational", label: "Operativas", count: operationalAlerts.length, color: "var(--text-body)", icon: "warning-circle" },
  ];
  const firstWithItems = tabs.find((t) => t.count > 0)?.key ?? "empty";
  const [picked, setPicked] = React.useState<TabKey | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const active = tabs.find((t) => t.key === picked && t.count > 0)?.key ?? firstWithItems;

  if (balanceAlerts.length === 0 && operationalAlerts.length === 0) {
    return (
      <EmptyState icon="check-circle" title="Todo en orden">
        No hay alertas pendientes en este momento.
      </EmptyState>
    );
  }

  const total = tabs.find((t) => t.key === active)!.count;
  const hidden = !expanded && total > VISIBLE_ROWS;
  const slice = <T,>(list: T[]) => (hidden ? list.slice(0, VISIBLE_ROWS) : list);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tabs.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              disabled={t.count === 0}
              onClick={() => {
                setPicked(t.key);
                setExpanded(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${selected ? t.color : "var(--border-subtle)"}`,
                background: selected ? "var(--surface-sunken)" : "transparent",
                color: t.count === 0 ? "var(--text-muted)" : "var(--text-heading)",
                opacity: t.count === 0 ? 0.55 : 1,
                cursor: t.count === 0 ? "default" : "pointer",
                font: "var(--weight-bold) 12.5px/1 var(--font-body)",
              }}
            >
              <Icon name={t.icon} size={15} color={t.color} />
              {t.label}
              <span style={{ color: "var(--text-muted)" }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div>
        {active === "operational"
          ? slice(operationalAlerts).map((a) => <Row key={a.kind} accent="var(--warning-fg)" icon="warning" title={a.label} subtitle={a.detail} to={a.href} linkLabel="Ver detalle" />)
          : slice(active === "empty" ? empty : low).map((item) => (
              <Row
                key={item.studentId}
                accent={active === "empty" ? "var(--danger-solid)" : "var(--warning-fg)"}
                icon={active === "empty" ? "battery-empty" : "battery-low"}
                title={item.studentName}
                subtitle={item.classroomName ?? "Sin salón activo"}
                trailing={active === "low" ? formatMinutesAsHours(item.balance) : undefined}
                to={item.classroomId ? `/admin/salones/${item.classroomId}` : `/admin/paquetes/${item.studentId}`}
                linkLabel={item.classroomId ? "Ver salón" : "Ver estudiante"}
              />
            ))}
      </div>

      {total > VISIBLE_ROWS && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ alignSelf: "flex-start", background: "none", border: 0, padding: "4px 0", cursor: "pointer", font: "var(--weight-bold) 12.5px/1 var(--font-body)", color: "var(--text-body)" }}
        >
          {expanded ? "Ver menos" : `Ver todos (${total})`}
        </button>
      )}
    </div>
  );
}
