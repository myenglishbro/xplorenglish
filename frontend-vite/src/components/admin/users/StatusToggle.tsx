import React from "react";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { useSetUserStatus } from "@/features/users/hooks";
import type { ProfileStatus } from "@/server/admin/users/types";

export interface StatusToggleProps {
  userId: string;
  status: string;
  isSelf: boolean;
}

export function StatusToggle({ userId, status, isSelf }: StatusToggleProps) {
  const mutation = useSetUserStatus(userId);
  const [current, setCurrent] = React.useState<ProfileStatus>(status === "active" ? "active" : "inactive");

  async function handleChange() {
    if (mutation.isPending) return;
    const next: ProfileStatus = current === "active" ? "inactive" : "active";
    try {
      await mutation.mutateAsync({ status: next, isSelf });
      setCurrent(next);
    } catch {
      // el error ya queda en mutation.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Switch checked={current === "active"} onChange={handleChange} disabled={mutation.isPending || isSelf} label={current === "active" ? "Perfil activo" : "Perfil inactivo"} />
      {isSelf && (
        <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
          No puedes desactivar tu propio perfil desde aquí.
        </span>
      )}
      {mutation.isError && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
    </div>
  );
}
