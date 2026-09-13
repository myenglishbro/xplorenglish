"use client";

import React from "react";
import { Icon } from "../core/Icon";

export interface SearchInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onSubmit?: (value?: string) => void;
  style?: React.CSSProperties;
}

export function SearchInput({ value, onChange, placeholder = "Buscar cursos, clases o materiales", onSubmit, style }: SearchInputProps) {
  const [f, setF] = React.useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        height: "var(--control-h-md)",
        padding: "0 6px 0 20px",
        background: "var(--surface-card)",
        border: "2px solid var(--border-accent)",
        borderRadius: "var(--radius-pill)",
        boxShadow: f ? "var(--focus-ring)" : "var(--shadow-xs)",
        transition: "var(--transition-control)",
        ...style,
      }}
    >
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: "none",
          background: "none",
          font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)",
          color: "var(--text-heading)",
        }}
      />
      <button
        type="submit"
        aria-label="Buscar"
        style={{
          width: 32,
          height: 32,
          border: 0,
          borderRadius: "var(--radius-pill)",
          background: "none",
          color: "var(--cyan-600)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="magnifying-glass" weight="bold" size={19} />
      </button>
    </form>
  );
}
