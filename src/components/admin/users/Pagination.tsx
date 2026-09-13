import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/core/Icon";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}

function buildHref(basePath: string, searchParams: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, pageSize, totalCount, basePath, searchParams }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
      <span style={{ font: "var(--weight-regular) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
        Página {page} de {totalPages} · {totalCount} usuario(s)
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <PaginationLink href={buildHref(basePath, searchParams, page - 1)} disabled={!canPrev} icon="caret-left" label="Anterior" />
        <PaginationLink href={buildHref(basePath, searchParams, page + 1)} disabled={!canNext} icon="caret-right" label="Siguiente" iconRight />
      </div>
    </div>
  );
}

function PaginationLink({ href, disabled, icon, label, iconRight }: { href: string; disabled: boolean; icon: string; label: string; iconRight?: boolean }) {
  const content = (
    <>
      {!iconRight && <Icon name={icon} size={14} />}
      {label}
      {iconRight && <Icon name={icon} size={14} />}
    </>
  );
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: "var(--control-h-sm)",
    padding: "0 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--action-secondary-border)",
    font: "var(--weight-bold) 13px/1 var(--font-display)",
    textDecoration: "none",
    color: disabled ? "var(--text-disabled)" : "var(--action-secondary-text)",
    background: disabled ? "var(--surface-disabled)" : "var(--surface-card)",
    pointerEvents: disabled ? "none" : "auto",
  };
  return (
    <Link href={href} style={style} aria-disabled={disabled}>
      {content}
    </Link>
  );
}
