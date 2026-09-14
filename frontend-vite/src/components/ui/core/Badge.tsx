import React from "react";

export type BadgeTone = "danger" | "accent" | "brand" | "success" | "neutral";

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: BadgeTone;
  /** Render as a bare status dot with no count. */
  dot?: boolean;
  style?: React.CSSProperties;
}

const TONES: Record<BadgeTone, [string, string]> = {
  danger: ["var(--danger-solid)", "#fff"],
  accent: ["var(--xp-cyan)", "var(--xp-black)"],
  brand: ["var(--xp-orange)", "#fff"],
  success: ["var(--success-solid)", "#fff"],
  neutral: ["var(--neutral-700)", "#fff"],
};

export function Badge({ children, tone = "danger", dot, style }: BadgeProps) {
  const [bg, fg] = TONES[tone];
  if (dot) {
    return (
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "var(--radius-pill)",
          background: bg,
          display: "inline-block",
          boxShadow: "0 0 0 2px var(--surface-card)",
          ...style,
        }}
      />
    );
  }
  return (
    <span
      style={{
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        font: "var(--weight-bold) 11px/1 var(--font-display)",
        boxShadow: "0 0 0 2px var(--surface-card)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
