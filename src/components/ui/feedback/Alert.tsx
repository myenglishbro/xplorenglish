"use client";

import React from "react";
import { Icon } from "../core/Icon";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const TONES: Record<AlertTone, [string, string, string, string]> = {
  info: ["var(--info-bg)", "var(--info-fg)", "var(--xp-cyan)", "info"],
  success: ["var(--success-bg)", "var(--success-fg)", "var(--success-solid)", "check-circle"],
  warning: ["var(--warning-bg)", "var(--warning-fg)", "var(--warning-solid)", "warning"],
  danger: ["var(--danger-bg)", "var(--danger-fg)", "var(--danger-solid)", "x-circle"],
};

export function Alert({ tone = "info", title, children, action, onClose, style }: AlertProps) {
  const [bg, fg, solid, ic] = TONES[tone];
  return (
    <div
      role="status"
      style={{ display: "flex", gap: 12, padding: "14px 16px", background: bg, borderRadius: "var(--radius-lg)", boxShadow: `inset 3px 0 0 ${solid}`, ...style }}
    >
      <Icon name={ic} size={20} color={solid} style={{ flex: "0 0 auto", marginTop: 1 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        {title && <div style={{ font: "var(--weight-bold) 15px/1.3 var(--font-display)", color: fg }}>{title}</div>}
        {children && <div style={{ font: "var(--weight-regular) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--text-body)" }}>{children}</div>}
        {action && <div style={{ marginTop: 6 }}>{action}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar" style={{ border: 0, background: "none", cursor: "pointer", color: fg, padding: 0, height: 20 }}>
          <Icon name="x" weight="bold" size={14} />
        </button>
      )}
    </div>
  );
}
