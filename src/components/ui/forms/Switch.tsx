"use client";

import React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Switch({ checked, onChange, label, disabled, style }: SwitchProps) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      <span
        style={{
          width: 44,
          height: 24,
          padding: 3,
          borderRadius: "var(--radius-pill)",
          background: disabled ? "var(--surface-disabled)" : checked ? "var(--xp-cyan)" : "var(--neutral-200)",
          display: "inline-flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background-color var(--duration-base) var(--ease-standard)",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "var(--radius-pill)",
            background: "#fff",
            boxShadow: "var(--shadow-sm)",
            transition: "transform var(--duration-base) var(--ease-standard)",
          }}
        />
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      {label && <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.35 var(--font-body)", color: disabled ? "var(--text-disabled)" : "var(--text-heading)" }}>{label}</span>}
    </label>
  );
}
