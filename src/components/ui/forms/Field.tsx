import React from "react";

export interface FieldProps {
  label?: string;
  hint?: string;
  /** When present, replaces the hint and turns it red. */
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Field({ label, hint, error, required, htmlFor, children, style }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{ font: "var(--weight-semibold) var(--text-label-size)/var(--text-label-lh) var(--font-body)", color: "var(--text-heading)" }}>
          {label}
          {required && <span style={{ color: "var(--danger-solid)", marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <span
          style={{
            font: "var(--weight-regular) var(--text-caption-size)/var(--text-caption-lh) var(--font-body)",
            color: error ? "var(--danger-fg)" : "var(--text-muted)",
          }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
