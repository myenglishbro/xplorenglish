"use client";

import React from "react";
import { Icon } from "../core/Icon";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Línea secundaria visible (p. ej. DNI). */
  description?: string;
  /** Texto adicional en el que también se busca. */
  searchText?: string;
}

export interface ComboboxProps {
  value?: string;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}

/** Minúsculas y sin acentos, para que "ange" encuentre "Angélica". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Combobox({ value, onChange, options, placeholder, emptyText = "Sin resultados", disabled, invalid, id }: ComboboxProps) {
  const listId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return options;
    return options.filter((o) => {
      const haystack = normalize(`${o.label} ${o.description ?? ""} ${o.searchText ?? ""}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(o: ComboboxOption) {
    onChange?.(o.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault(); // no enviar el formulario al elegir
        if (filtered[active]) choose(filtered[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    }
  }

  const bd = invalid ? "var(--danger-solid)" : focused ? "var(--border-accent)" : "var(--border-default)";

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: "var(--control-h-md)",
          padding: "0 14px",
          background: disabled ? "var(--surface-disabled)" : "var(--surface-card)",
          border: `${focused || invalid ? 2 : 1}px solid ${bd}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused ? "var(--focus-ring)" : "none",
          transition: "var(--transition-control)",
        }}
      >
        <Icon name="magnifying-glass" weight="regular" size={17} color={focused ? "var(--text-accent)" : "var(--text-subtle)"} />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : selected ? `${selected.label}${selected.description ? ` · ${selected.description}` : ""}` : ""}
          placeholder={open && selected ? selected.label : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: "none",
            background: "none",
            font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)",
            color: disabled ? "var(--text-disabled)" : "var(--text-heading)",
          }}
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))",
          }}
        >
          {filtered.length === 0 && (
            <li style={{ padding: "10px 12px", color: "var(--text-subtle)", font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)" }}>{emptyText}</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => {
                e.preventDefault(); // evita perder el foco antes de elegir
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderRadius: "var(--radius-sm, 6px)",
                background: i === active ? "var(--surface-hover, rgba(0,0,0,0.05))" : "transparent",
                font: "var(--weight-regular) var(--text-body-size)/1.4 var(--font-body)",
                color: "var(--text-heading)",
              }}
            >
              <div>{o.label}</div>
              {o.description && <div style={{ fontSize: "0.85em", color: "var(--text-muted)" }}>{o.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
