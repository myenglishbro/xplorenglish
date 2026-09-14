import React from "react";

export interface SpinnerProps {
  size?: number;
  color?: string;
  /** Visible caption and accessible label. */
  label?: string;
  style?: React.CSSProperties;
}

export function Spinner({ size = 22, color = "var(--xp-orange)", label, style }: SpinnerProps) {
  return (
    <span role="status" aria-label={label || "Cargando"} style={{ display: "inline-flex", alignItems: "center", gap: 10, ...style }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${Math.max(2, size / 9)}px solid var(--neutral-100)`,
          borderTopColor: color,
          display: "inline-block",
          animation: "xp-rot .7s linear infinite",
        }}
      />
      {label && <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.2 var(--font-body)", color: "var(--text-muted)" }}>{label}</span>}
      <style>{"@keyframes xp-rot{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}
