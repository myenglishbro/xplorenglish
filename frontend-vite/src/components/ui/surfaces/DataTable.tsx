"use client";

import React from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  /** Custom cell renderer, e.g. row => <Tag>{row.status}</Tag> */
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns?: DataTableColumn<T>[];
  rows?: T[];
  dense?: boolean;
  onRowClick?: (row: T, index: number) => void;
  style?: React.CSSProperties;
}

export function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({ columns = [], rows = [], dense, onRowClick, style }: DataTableProps<T>) {
  const [hi, setHi] = React.useState(-1);
  return (
    <div style={{ width: "100%", overflowX: "auto", ...style }}>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--weight-regular) var(--text-body-sm-size)/1.45 var(--font-body)" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align || "left",
                  padding: dense ? "10px 14px" : "13px 20px",
                  background: "var(--surface-sunken)",
                  borderBottom: "1px solid var(--border-default)",
                  whiteSpace: "nowrap",
                  font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(r, i)}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(-1)}
              style={{ background: hi === i ? "var(--surface-hover)" : "transparent", cursor: onRowClick ? "pointer" : "default", transition: "background-color var(--duration-fast) var(--ease-standard)" }}
            >
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || "left", padding: dense ? "10px 14px" : "14px 20px", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-body)", verticalAlign: "middle" }}>
                  {c.render ? c.render(r) : (r[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
