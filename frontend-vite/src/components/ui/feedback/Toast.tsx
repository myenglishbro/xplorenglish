"use client";

import React from "react";
import { Icon } from "../core/Icon";

export type ToastTone = "success" | "info" | "warning" | "danger";

export interface ToastProps {
  tone?: ToastTone;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const ICONS: Record<ToastTone, [string, string]> = {
  success: ["check-circle", "var(--success-solid)"],
  info: ["info", "var(--xp-cyan)"],
  warning: ["warning", "var(--warning-solid)"],
  danger: ["x-circle", "var(--danger-solid)"],
};

export function Toast({ tone = "success", title, children, onClose, style }: ToastProps) {
  const [ic, c] = ICONS[tone];
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        minWidth: 300,
        maxWidth: 400,
        padding: "14px 16px",
        background: "var(--surface-inverse)",
        color: "var(--text-inverse)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        ...style,
      }}
    >
      <Icon name={ic} size={20} color={c} style={{ flex: "0 0 auto", marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: "var(--weight-bold) 14.5px/1.3 var(--font-display)" }}>{title}</div>
        {children && <div style={{ font: "var(--weight-regular) var(--text-caption-size)/1.5 var(--font-body)", color: "var(--neutral-300)", marginTop: 2 }}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar" style={{ border: 0, background: "none", cursor: "pointer", color: "var(--neutral-300)", padding: 0, height: 20 }}>
          <Icon name="x" weight="bold" size={13} />
        </button>
      )}
    </div>
  );
}
