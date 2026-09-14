"use client";

import React from "react";
import { Icon } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  /** Phosphor icon name rendered before the label. */
  icon?: string;
  iconRight?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

const H: Record<ButtonSize, string> = { sm: "var(--control-h-sm)", md: "var(--control-h-md)", lg: "var(--control-h-lg)" };
const PAD: Record<ButtonSize, string> = { sm: "0 16px", md: "0 24px", lg: "0 32px" };
const FS: Record<ButtonSize, string> = { sm: "13px", md: "14px", lg: "15px" };

interface VariantStyle {
  bg: string;
  fg: string;
  bd: string;
  sh: string;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth,
  onClick,
  type = "button",
  style,
  ...rest
}: ButtonProps) {
  const [h, setH] = React.useState(false);
  const [a, setA] = React.useState(false);
  const off = disabled || loading;

  const variants: Record<ButtonVariant, VariantStyle> = {
    primary: { bg: h && !off ? "var(--action-primary-hover)" : "var(--action-primary)", fg: "var(--text-on-brand)", bd: "transparent", sh: off ? "none" : "var(--shadow-brand)" },
    secondary: { bg: h && !off ? "var(--orange-50)" : "var(--surface-card)", fg: "var(--action-secondary-text)", bd: "var(--action-secondary-border)", sh: "none" },
    accent: { bg: h && !off ? "var(--action-accent-hover)" : "var(--action-accent)", fg: "var(--text-on-accent)", bd: "transparent", sh: off ? "none" : "var(--shadow-accent)" },
    ghost: { bg: h && !off ? "var(--surface-hover)" : "transparent", fg: "var(--text-heading)", bd: "transparent", sh: "none" },
    inverse: { bg: h && !off ? "var(--neutral-800)" : "var(--surface-inverse)", fg: "var(--text-inverse)", bd: "transparent", sh: "none" },
    danger: { bg: h && !off ? "var(--red-600)" : "var(--danger-solid)", fg: "#fff", bd: "transparent", sh: "none" },
  };
  const V = variants[variant];

  return (
    <button
      type={type}
      disabled={off}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => {
        setH(false);
        setA(false);
      }}
      onMouseDown={() => setA(true)}
      onMouseUp={() => setA(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: H[size],
        padding: PAD[size],
        width: fullWidth ? "100%" : "auto",
        font: `var(--weight-bold) ${FS[size]}/1 var(--font-display)`,
        letterSpacing: "var(--text-button-ls)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: off ? "not-allowed" : "pointer",
        borderRadius: "var(--radius-md)",
        border: `2px solid ${off ? "transparent" : V.bd}`,
        background: off ? "var(--surface-disabled)" : V.bg,
        color: off ? "var(--text-disabled)" : V.fg,
        boxShadow: V.sh,
        transform: a && !off ? "scale(var(--press-scale))" : "none",
        transition: "var(--transition-control)",
        ...style,
      }}
      {...rest}
    >
      {loading && <Icon name="circle-notch" size={16} style={{ animation: "xp-spin .8s linear infinite" }} />}
      {!loading && icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 17} />}
      <style>{"@keyframes xp-spin{to{transform:rotate(360deg)}}"}</style>
    </button>
  );
}
