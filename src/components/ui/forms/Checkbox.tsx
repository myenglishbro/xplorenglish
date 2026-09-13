"use client";

import React from "react";
import { Icon } from "../core/Icon";

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  description?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Checkbox({ checked, onChange, label, description, disabled, indeterminate, style }: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label style={{ display: "flex", gap: 10, alignItems: description ? "flex-start" : "center", cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      <span
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          marginTop: description ? 2 : 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-xs)",
          border: `2px solid ${disabled ? "var(--border-default)" : on ? "var(--xp-cyan)" : "var(--border-strong)"}`,
          background: disabled ? "var(--surface-disabled)" : on ? "var(--xp-cyan)" : "var(--surface-card)",
          transition: "var(--transition-control)",
        }}
      >
        {on && <Icon name={indeterminate ? "minus" : "check"} weight="bold" size={13} color="var(--xp-black)" />}
      </span>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      {label && (
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.35 var(--font-body)", color: disabled ? "var(--text-disabled)" : "var(--text-heading)" }}>{label}</span>
          {description && <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.45 var(--font-body)", color: "var(--text-muted)" }}>{description}</span>}
        </span>
      )}
    </label>
  );
}
