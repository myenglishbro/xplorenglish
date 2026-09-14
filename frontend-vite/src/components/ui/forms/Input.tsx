"use client";

import React from "react";
import { Icon } from "../core/Icon";

export type InputSize = "sm" | "md";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Phosphor icon name shown at the left edge. */
  icon?: string;
  iconRight?: string;
  size?: InputSize;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  fullWidth?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  iconRight,
  size = "md",
  invalid,
  disabled,
  readOnly,
  fullWidth = true,
  id,
  style,
  ...rest
}: InputProps) {
  const [f, setF] = React.useState(false);
  const bd = invalid ? "var(--danger-solid)" : f ? "var(--border-accent)" : "var(--border-default)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: fullWidth ? "100%" : "auto",
        height: size === "sm" ? "var(--control-h-sm)" : "var(--control-h-md)",
        padding: "0 14px",
        background: disabled ? "var(--surface-disabled)" : "var(--surface-card)",
        border: `${f || invalid ? 2 : 1}px solid ${bd}`,
        borderRadius: "var(--radius-md)",
        boxShadow: f ? "var(--focus-ring)" : "none",
        transition: "var(--transition-control)",
        ...style,
      }}
    >
      {icon && <Icon name={icon} weight="regular" size={17} color={f ? "var(--text-accent)" : "var(--text-subtle)"} />}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: "none",
          background: "none",
          font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)",
          color: disabled ? "var(--text-disabled)" : "var(--text-heading)",
        }}
        {...rest}
      />
      {iconRight && <Icon name={iconRight} weight="regular" size={17} color="var(--text-subtle)" />}
    </div>
  );
}
