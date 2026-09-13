import React from "react";
import { Icon } from "../core/Icon";

export interface EmptyStateProps {
  /** Phosphor icon name shown in the cyan circle. */
  icon?: string;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({ icon = "folder-open", title, children, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "48px 24px",
        background: "var(--surface-sunken)",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-lg)",
        ...style,
      }}
    >
      <span style={{ width: 56, height: 56, borderRadius: "var(--radius-pill)", background: "var(--surface-accent-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color="var(--cyan-600)" />
      </span>
      {title && <div style={{ font: "var(--weight-bold) 17px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{title}</div>}
      {children && <div style={{ maxWidth: 380, font: "var(--weight-regular) var(--text-body-sm-size)/1.55 var(--font-body)", color: "var(--text-muted)" }}>{children}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
