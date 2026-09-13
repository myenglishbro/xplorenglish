import React from "react";
import { Logo } from "../core/Logo";

export interface SiteFooterColumn {
  title: string;
  links: string[];
}

export interface SiteFooterProps {
  columns?: SiteFooterColumn[];
  tagline?: string;
  assetBase?: string;
  style?: React.CSSProperties;
}

export function SiteFooter({ columns = [], tagline = "English for the real world", assetBase = "/assets", style }: SiteFooterProps) {
  return (
    <footer style={{ background: "var(--surface-inverse)", color: "var(--text-inverse)", padding: "36px 32px 28px", borderRadius: "var(--radius-lg)", ...style }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
        <div style={{ maxWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>
          <Logo height={40} assetBase={assetBase} />
          <p style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--neutral-300)" }}>{tagline}</p>
        </div>
        {columns.map((c) => (
          <div key={c.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ font: "var(--weight-bold) var(--text-eyebrow-size)/1 var(--font-display)", letterSpacing: "var(--text-eyebrow-ls)", textTransform: "uppercase", color: "var(--xp-cyan)" }}>{c.title}</div>
            {c.links.map((l) => (
              <a key={l} href="#" style={{ font: "var(--weight-regular) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--neutral-200)", textDecoration: "none" }}>
                {l}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.14)", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--neutral-400)" }}>
        © {new Date().getFullYear()} X-plore English · Lima, Perú
      </div>
    </footer>
  );
}
