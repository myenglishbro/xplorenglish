import React from "react";

export type AvatarTone = "accent" | "brand" | "neutral";

export interface AvatarProps {
  name?: string;
  /** Image URL; falls back to initials on a tinted circle. */
  src?: string;
  size?: number;
  /** Renders name + this line beside the circle. */
  subtitle?: string;
  tone?: AvatarTone;
  style?: React.CSSProperties;
}

function initials(name?: string): string {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, src, size = 36, subtitle, tone = "accent", style }: AvatarProps) {
  const bg = tone === "brand" ? "var(--orange-100)" : tone === "neutral" ? "var(--neutral-100)" : "var(--cyan-100)";
  const fg = tone === "brand" ? "var(--orange-700)" : tone === "neutral" ? "var(--neutral-700)" : "var(--cyan-700)";
  const mark = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "var(--radius-pill)", objectFit: "cover", display: "block" }} />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: `var(--weight-bold) ${Math.round(size * 0.38)}px/1 var(--font-display)`,
      }}
    >
      {initials(name)}
    </span>
  );
  if (!subtitle) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", ...style }} title={name}>
        {mark}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, ...style }}>
      {mark}
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span style={{ font: "var(--weight-semibold) 13.5px/1.25 var(--font-body)", color: "var(--text-heading)" }}>{name}</span>
        <span style={{ font: "var(--weight-regular) 12px/1.25 var(--font-body)", color: "var(--text-muted)" }}>{subtitle}</span>
      </span>
    </span>
  );
}
