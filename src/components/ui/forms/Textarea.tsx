"use client";

import React from "react";

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Textarea({ value, onChange, placeholder, rows = 4, invalid, disabled, id, style, ...rest }: TextareaProps) {
  const [f, setF] = React.useState(false);
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%",
        padding: "12px 14px",
        resize: "vertical",
        outline: "none",
        background: disabled ? "var(--surface-disabled)" : "var(--surface-card)",
        color: "var(--text-heading)",
        font: "var(--weight-regular) var(--text-body-size)/1.55 var(--font-body)",
        border: `${f || invalid ? 2 : 1}px solid ${invalid ? "var(--danger-solid)" : f ? "var(--border-accent)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: f ? "var(--focus-ring)" : "none",
        transition: "var(--transition-control)",
        ...style,
      }}
      {...rest}
    />
  );
}
