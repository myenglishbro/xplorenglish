import React from "react";
import { Icon } from "../core/Icon";

export type StatCardDeltaTone = "success" | "danger" | "neutral";
export type StatCardTone = "accent" | "brand";

export interface StatCardProps {
  label: string;
  value: string | number;
  /** e.g. "+12% vs. marzo" */
  delta?: string;
  deltaTone?: StatCardDeltaTone;
  icon?: string;
  tone?: StatCardTone;
  style?: React.CSSProperties;
}

export function StatCard({ label, value, delta, deltaTone = "success", icon, tone = "accent", style }: StatCardProps) {
  const bg = tone === "brand" ? "var(--surface-brand-subtle)" : "var(--surface-accent-subtle)";
  const fg = tone === "brand" ? "var(--orange-600)" : "var(--cyan-600)";
  const dc: Record<StatCardDeltaTone, string> = { success: "var(--success-fg)", danger: "var(--danger-fg)", neutral: "var(--text-muted)" };
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14, ...style }}>
      {icon && (
        <span style={{ flex: "0 0 auto", width: 42, height: 42, borderRadius: "var(--radius-md)", background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={21} color={fg} />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "var(--weight-semibold) var(--text-caption-size)/1.2 var(--font-body)", color: "var(--text-muted)" }}>{label}</div>
        <div style={{ font: "var(--weight-extrabold) 27px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "var(--text-heading)", marginTop: 4 }}>{value}</div>
        {delta && (
          <div style={{ marginTop: 4, font: "var(--weight-semibold) 12.5px/1.2 var(--font-body)", color: dc[deltaTone], display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name={deltaTone === "danger" ? "trend-down" : "trend-up"} size={13} />
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}
