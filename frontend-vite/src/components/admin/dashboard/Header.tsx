import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/core/Icon";

const QUICK_ACTIONS = [
  { href: "/admin/usuarios", label: "Usuarios", icon: "users-three" },
  { href: "/admin/salones", label: "Salones", icon: "chalkboard" },
  { href: "/admin/calendario", label: "Calendario", icon: "calendar-blank" },
  { href: "/admin/pagos-docentes", label: "Pagos docentes", icon: "money" },
] as const;

export interface DashboardHeaderProps {
  firstName: string;
  dateLabel: string;
  contextSentence: string;
}

export function DashboardHeader({ firstName, dateLabel, contextSentence }: DashboardHeaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "var(--space-3)" }}>
        <div>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
              textTransform: "capitalize",
            }}
          >
            Hola, {firstName}
          </h1>
          <p style={{ margin: "4px 0 0", font: "var(--weight-regular) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {dateLabel}
          </p>
          <p style={{ margin: "6px 0 0", font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-body)" }}>
            {contextSentence}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0 16px",
                height: "var(--control-h-md)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--action-secondary-border)",
                background: "var(--surface-card)",
                color: "var(--action-secondary-text)",
                font: "var(--weight-bold) 13px/1 var(--font-display)",
                textDecoration: "none",
              }}
            >
              <Icon name={action.icon} size={16} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
