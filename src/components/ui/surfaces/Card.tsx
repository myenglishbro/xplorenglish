import React from "react";

export type CardElevation = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Set false to remove inner padding (for flush tables and media). */
  pad?: boolean;
  elevation?: CardElevation;
  /** 'brand' | 'accent' | any CSS colour — draws a 3px top rule. */
  accent?: "brand" | "accent" | string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}

const SHADOWS: Record<CardElevation, string> = { none: "none", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };

export function Card({ children, pad = true, elevation = "sm", accent, header, footer, style, ...rest }: CardProps) {
  const sh = SHADOWS[elevation];
  const top = accent ? { borderTop: `3px solid ${accent === "accent" ? "var(--xp-cyan)" : accent === "brand" ? "var(--xp-orange)" : accent}` } : null;
  return (
    <section
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: sh,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...top,
        ...style,
      }}
      {...rest}
    >
      {header && <div style={{ padding: "16px var(--card-pad)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12 }}>{header}</div>}
      <div style={{ padding: pad ? "var(--card-pad)" : 0, flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: "14px var(--card-pad)", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-sunken)" }}>{footer}</div>}
    </section>
  );
}
