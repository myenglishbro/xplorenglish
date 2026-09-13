import React from "react";

export type ProgressBarSize = "sm" | "md";
export type ProgressBarTone = "brand" | "accent" | "success";

export interface ProgressBarProps {
  /** 0–100. */
  value?: number;
  label?: string;
  showValue?: boolean;
  size?: ProgressBarSize;
  tone?: ProgressBarTone;
  style?: React.CSSProperties;
}

export function ProgressBar({ value = 0, label, showValue, size = "md", tone = "brand", style }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  const fill = tone === "success" ? "var(--progress-fill-complete)" : tone === "accent" ? "var(--xp-cyan)" : "var(--progress-fill)";
  return (
    <div style={{ width: "100%", ...style }}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, font: "var(--weight-medium) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
          <span>{label}</span>
          {showValue && <span style={{ color: "var(--text-heading)", fontWeight: "var(--weight-bold)" as React.CSSProperties["fontWeight"] }}>{v}%</span>}
        </div>
      )}
      <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} style={{ height: size === "sm" ? 6 : 10, borderRadius: "var(--radius-pill)", background: "var(--progress-track)", overflow: "hidden" }}>
        <div style={{ width: v + "%", height: "100%", background: fill, borderRadius: "var(--radius-pill)", transition: "width var(--duration-slow) var(--ease-standard)" }} />
      </div>
    </div>
  );
}
