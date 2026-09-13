"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { setUserStatusAction } from "@/server/admin/users/actions";
import type { ProfileStatus } from "@/server/admin/users/types";

export interface StatusToggleProps {
  userId: string;
  status: string;
  isSelf: boolean;
}

export function StatusToggle({ userId, status, isSelf }: StatusToggleProps) {
  const router = useRouter();
  const [current, setCurrent] = React.useState<ProfileStatus>(status === "active" ? "active" : "inactive");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleChange() {
    if (pending) return;
    const next: ProfileStatus = current === "active" ? "inactive" : "active";
    setPending(true);
    setError(undefined);
    try {
      const result = await setUserStatusAction(userId, next);
      if (result.error) {
        setError(result.error);
      } else {
        setCurrent(next);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Switch checked={current === "active"} onChange={handleChange} disabled={pending || isSelf} label={current === "active" ? "Perfil activo" : "Perfil inactivo"} />
      {isSelf && (
        <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
          No puedes desactivar tu propio perfil desde aquí.
        </span>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
