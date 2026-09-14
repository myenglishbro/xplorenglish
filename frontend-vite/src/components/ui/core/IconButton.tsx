"use client";

import React from "react";
import { Icon } from "./Icon";

export type IconButtonVariant = "ghost" | "outline" | "primary" | "accent";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Phosphor icon name. */
  icon: string;
  /** Required accessible label (also used as the tooltip). */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

const S: Record<IconButtonSize, number> = { sm: 30, md: 38, lg: 44 };

interface VariantStyle {
  bg: string;
  fg: string;
  bd: string;
}

export function IconButton({ icon, label, variant = "ghost", size = "md", disabled, active, onClick, style, ...rest }: IconButtonProps) {
  const [h, setH] = React.useState(false);
  const variants: Record<IconButtonVariant, VariantStyle> = {
    ghost: { bg: h ? "var(--surface-hover)" : "transparent", fg: "var(--text-body)", bd: "transparent" },
    outline: { bg: h ? "var(--surface-hover)" : "var(--surface-card)", fg: "var(--text-heading)", bd: "var(--border-default)" },
    primary: { bg: h ? "var(--action-primary-hover)" : "var(--action-primary)", fg: "#fff", bd: "transparent" },
    accent: { bg: h ? "var(--action-accent-hover)" : "var(--action-accent)", fg: "var(--xp-black)", bd: "transparent" },
  };
  const on = active ? { bg: "var(--surface-selected)", fg: "var(--text-accent)", bd: "transparent" } : variants[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: S[size],
        height: S[size],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${on.bd}`,
        background: disabled ? "var(--surface-disabled)" : on.bg,
        color: disabled ? "var(--text-disabled)" : on.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "var(--transition-control)",
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} weight={variant === "ghost" || variant === "outline" ? "regular" : "fill"} size={size === "sm" ? 16 : 19} />
    </button>
  );
}
