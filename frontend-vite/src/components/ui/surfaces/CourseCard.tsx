"use client";

import React from "react";
import { Avatar } from "./Avatar";
import { Tag } from "../core/Tag";
import { Icon } from "../core/Icon";
import { ProgressBar } from "../feedback/ProgressBar";

export interface CourseCardProps {
  title: string;
  instructor?: string;
  instructorSrc?: string;
  /** Level pill, e.g. "B1". */
  level?: string;
  icon?: string;
  /** 0–100; omit to hide the bar. */
  progress?: number;
  /** Small supporting line (schedule, sessions remaining). */
  meta?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function CourseCard({ title, instructor, instructorSrc, level, icon = "book-open", progress, meta, action, onClick, style }: CourseCardProps) {
  const [h, setH] = React.useState(false);
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)",
        padding: "18px 20px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: onClick ? "pointer" : "default",
        transform: h && onClick ? "translateY(-2px)" : "none",
        transition: "box-shadow var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-standard)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ flex: "0 0 auto", width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--surface-accent-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={22} color="var(--cyan-600)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ font: "var(--weight-bold) 16.5px/1.3 var(--font-display)", color: "var(--text-heading)", margin: 0 }}>{title}</h4>
          {meta && <div style={{ marginTop: 4, font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>{meta}</div>}
        </div>
        {level && (
          <Tag tone="accent" size="sm">
            {level}
          </Tag>
        )}
      </div>
      {instructor && <Avatar name={instructor} src={instructorSrc} size={28} subtitle="Docente" />}
      {typeof progress === "number" && <ProgressBar value={progress} size="sm" label="Avance" showValue />}
      {action && <div style={{ marginTop: 2 }}>{action}</div>}
    </article>
  );
}
