import { Tag } from "@/components/ui/core/Tag";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { RoleChangeEntry, UserRole } from "@/server/admin/users/types";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", teacher: "Docente", student: "Estudiante" };

export function RoleChangesHistory({ entries }: { entries: RoleChangeEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState icon="clock-counter-clockwise" title="Sin cambios de rol">
        Este perfil nunca cambió de rol.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {entries.map((entry) => (
        <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          <Tag tone="neutral" size="sm">{ROLE_LABEL[entry.previousRole]}</Tag>
          <span style={{ color: "var(--text-muted)" }}>→</span>
          <Tag tone="accent" size="sm">{ROLE_LABEL[entry.newRole]}</Tag>
          <span style={{ marginLeft: "auto", font: "var(--weight-regular) 12px/1.3 var(--font-body)", color: "var(--text-muted)" }}>
            {entry.changedByName} · {formatShortDateInLima(entry.changedAt)} {formatTimeInLima(entry.changedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
