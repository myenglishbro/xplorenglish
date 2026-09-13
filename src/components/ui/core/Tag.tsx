"use client";

import React from "react";
import { Icon } from "./Icon";

export type TagTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";
export type TagSize = "sm" | "md";

export interface TagProps {
  children?: React.ReactNode;
  tone?: TagTone;
  icon?: string;
  size?: TagSize;
  /** Renders a dismiss × when provided. */
  onRemove?: () => void;
  style?: React.CSSProperties;
}

const TONES: Record<TagTone, [string, string, string]> = {
  neutral: ["var(--neutral-50)", "var(--neutral-700)", "var(--border-default)"],
  brand: ["var(--orange-50)", "var(--orange-700)", "var(--orange-200)"],
  accent: ["var(--cyan-50)", "var(--cyan-700)", "var(--cyan-200)"],
  success: ["var(--success-bg)", "var(--success-fg)", "#BFE8D1"],
  warning: ["var(--warning-bg)", "var(--warning-fg)", "#F5DFA8"],
  danger: ["var(--danger-bg)", "var(--danger-fg)", "#F5C6C6"],
};

export function Tag({ children, tone = "neutral", icon, onRemove, size = "md", style }: TagProps) {
  const [bg, fg, bd] = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: size === "sm" ? 22 : 28,
        padding: size === "sm" ? "0 8px" : "0 12px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        font: `var(--weight-semibold) ${size === "sm" ? "11px" : "12.5px"}/1 var(--font-body)`,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 12 : 14} />}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar"
          style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", display: "inline-flex" }}
        >
          <Icon name="x" weight="bold" size={11} />
        </button>
      )}
    </span>
  );
}
