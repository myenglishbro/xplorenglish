"use client";

import React from "react";
import { Icon } from "../core/Icon";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Strings or {value,label} pairs. */
  options?: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Select({ value, onChange, options = [], placeholder, disabled, invalid, id, style }: SelectProps) {
  const [f, setF] = React.useState(false);
  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: "100%",
          height: "var(--control-h-md)",
          padding: "0 40px 0 14px",
          appearance: "none",
          outline: "none",
          background: disabled ? "var(--surface-disabled)" : "var(--surface-card)",
          color: value ? "var(--text-heading)" : "var(--text-subtle)",
          font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)",
          border: `${f || invalid ? 2 : 1}px solid ${invalid ? "var(--danger-solid)" : f ? "var(--border-accent)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          boxShadow: f ? "var(--focus-ring)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "var(--transition-control)",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <Icon
        name="caret-down"
        weight="bold"
        size={15}
        color="var(--text-muted)"
        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
    </div>
  );
}
