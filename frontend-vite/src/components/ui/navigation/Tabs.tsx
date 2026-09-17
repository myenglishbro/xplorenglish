"use client";

import React from "react";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items?: (string | TabItem)[];
  value?: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function Tabs({ items = [], value, onChange, fullWidth, style }: TabsProps) {
  return (
    <div
      style={{
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        role="tablist"
        style={{
          display: "inline-flex",
          padding: 4,
          gap: 4,
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-xs)",
          width: fullWidth ? "100%" : "auto",
          ...style,
        }}
      >
        {items.map((it) => {
          const v = typeof it === "string" ? it : it.value;
          const l = typeof it === "string" ? it : it.label;
          const act = v === value;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={act}
              onClick={() => onChange?.(v)}
              style={{
                flex: fullWidth ? "1 0 auto" : "0 0 auto",
                whiteSpace: "nowrap",
                height: 36,
                padding: "0 20px",
                border: 0,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
                background: act ? "var(--xp-cyan)" : "transparent",
                color: act ? "var(--xp-black)" : "var(--text-body)",
                font: `var(--weight-${act ? "bold" : "medium"}) 14px/1 var(--font-display)`,
                transition: "var(--transition-control)",
              }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
