"use client";

import React from "react";

export interface RadioProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  description?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Radio({ checked, onChange, label, description, name, value, disabled, style }: RadioProps) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: description ? "flex-start" : "center", cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      <span
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          marginTop: description ? 2 : 0,
          borderRadius: "var(--radius-pill)",
          border: `2px solid ${disabled ? "var(--border-default)" : checked ? "var(--xp-cyan)" : "var(--border-strong)"}`,
          background: "var(--surface-card)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition-control)",
        }}
      >
        {checked && <span style={{ width: 10, height: 10, borderRadius: "var(--radius-pill)", background: "var(--xp-cyan)" }} />}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      {label && (
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.35 var(--font-body)", color: disabled ? "var(--text-disabled)" : "var(--text-heading)" }}>{label}</span>
          {description && <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.45 var(--font-body)", color: "var(--text-muted)" }}>{description}</span>}
        </span>
      )}
    </label>
  );
}
