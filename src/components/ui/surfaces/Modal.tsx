"use client";

import React from "react";
import { IconButton } from "../core/IconButton";

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** Action row, right-aligned on a sunken footer. */
  footer?: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
}

export function Modal({ open, onClose, title, description, children, footer, width = 520, style }: ModalProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(3px)",
        animation: "xp-fade var(--duration-base) var(--ease-out)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: width, background: "var(--surface-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl)", overflow: "hidden", animation: "xp-pop var(--duration-base) var(--ease-standard)", ...style }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "22px 24px 0" }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ font: "var(--weight-bold) 21px/1.25 var(--font-display)", letterSpacing: "-.012em", color: "var(--text-heading)", margin: 0 }}>{title}</h3>
            {description && <p style={{ marginTop: 6, font: "var(--weight-regular) var(--text-body-sm-size)/1.55 var(--font-body)", color: "var(--text-muted)" }}>{description}</p>}
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-sunken)" }}>{footer}</div>}
      </div>
      <style>{"@keyframes xp-fade{from{opacity:0}}@keyframes xp-pop{from{opacity:0;transform:translateY(12px) scale(.98)}}"}</style>
    </div>
  );
}
