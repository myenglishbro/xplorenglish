"use client";

import React from "react";
import { Icon } from "../core/Icon";
import { Badge } from "../core/Badge";
import { Logo } from "../core/Logo";

export interface SidebarNavItem {
  value: string;
  label: string;
  /** Phosphor icon name. */
  icon: string;
  /** Renders an uppercase group heading above this item. */
  section?: string;
  badge?: string | number;
}

export interface SidebarNavProps {
  items?: SidebarNavItem[];
  value?: string;
  onChange?: (value: string) => void;
  footer?: React.ReactNode;
  assetBase?: string;
  style?: React.CSSProperties;
}

export function SidebarNav({ items = [], value, onChange, footer, assetBase = "/assets", style }: SidebarNavProps) {
  return (
    <nav
      style={{
        width: "var(--sidebar-width)",
        flex: "0 0 var(--sidebar-width)",
        minHeight: "100%",
        background: "var(--surface-card)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        gap: 24,
        ...style,
      }}
    >
      <div style={{ padding: "0 4px" }}>
        <Logo height={38} assetBase={assetBase} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it) => {
          const act = it.value === value;
          return (
            <React.Fragment key={it.value}>
              {it.section && (
                <div
                  style={{
                    padding: "14px 10px 6px",
                    font: "var(--weight-bold) var(--text-eyebrow-size)/1 var(--font-display)",
                    letterSpacing: "var(--text-eyebrow-ls)",
                    textTransform: "uppercase",
                    color: "var(--text-subtle)",
                  }}
                >
                  {it.section}
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange?.(it.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  height: 44,
                  padding: "0 12px",
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: "var(--radius-md)",
                  background: act ? "var(--surface-selected)" : "transparent",
                  color: act ? "var(--cyan-700)" : "var(--text-body)",
                  font: `var(--weight-${act ? "bold" : "medium"}) 14.5px/1 var(--font-body)`,
                  boxShadow: act ? "inset 3px 0 0 var(--xp-cyan)" : "none",
                  transition: "var(--transition-control)",
                }}
              >
                <Icon name={it.icon} weight={act ? "fill" : "regular"} size={20} color={act ? "var(--xp-cyan)" : "var(--text-muted)"} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && <Badge tone={act ? "accent" : "danger"}>{it.badge}</Badge>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {footer && <div style={{ marginTop: "auto" }}>{footer}</div>}
    </nav>
  );
}
