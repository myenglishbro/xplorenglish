import React from "react";
import { IconButton } from "../core/IconButton";
import { Badge } from "../core/Badge";
import { Avatar } from "../surfaces/Avatar";

export interface TopBarUser {
  name: string;
  role?: string;
  src?: string;
}

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  /** Extra controls (search, filters, primary CTA) placed left of the bell. */
  children?: React.ReactNode;
  user?: TopBarUser;
  notifications?: number;
  /** Shows a hamburger for compact layouts. */
  onMenu?: () => void;
  style?: React.CSSProperties;
}

export function TopBar({ title, subtitle, children, user, notifications, onMenu, style }: TopBarProps) {
  return (
    <header
      style={{
        height: "var(--topbar-height)",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 clamp(12px, 4vw, 24px)",
        background: "var(--surface-card)",
        borderBottom: "1px solid var(--border-subtle)",
        ...style,
      }}
    >
      {onMenu && <IconButton icon="list" label="Menú" onClick={onMenu} />}
      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
        {title && (
          <div
            style={{
              font: "var(--weight-bold) 19px/1.2 var(--font-display)",
              letterSpacing: "-.01em",
              color: "var(--text-heading)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
        )}
        {subtitle && <div style={{ font: "var(--weight-regular) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {children}
        <span style={{ position: "relative", display: "inline-flex" }}>
          <IconButton icon="bell" label="Notificaciones" />
          {notifications ? <Badge style={{ position: "absolute", top: -2, right: -4 }}>{notifications}</Badge> : null}
        </span>
        {user && <Avatar name={user.name} src={user.src} size={38} subtitle={user.role} />}
      </div>
    </header>
  );
}
