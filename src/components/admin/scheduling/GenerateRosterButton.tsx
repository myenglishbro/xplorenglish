"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { initializeAttendanceAction } from "@/server/scheduling/actions";

/** Sin modal de confirmación (no destructivo, idempotente) -- pero SÍ espera la respuesta real
 * del servidor antes de reflejar nada, como el resto de este bloque. */
export function GenerateRosterButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await initializeAttendanceAction(sessionId);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
      <Button variant="primary" size="sm" icon="users-three" onClick={handleClick} loading={pending} disabled={pending}>
        Generar roster
      </Button>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
