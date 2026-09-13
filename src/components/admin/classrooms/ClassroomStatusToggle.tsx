"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { setClassroomStatusAction } from "@/server/admin/classrooms/actions";
import type { ClassroomStatus } from "@/server/admin/classrooms/types";

export function ClassroomStatusToggle({ classroomId, status }: { classroomId: number; status: ClassroomStatus }) {
  const router = useRouter();
  const [current, setCurrent] = React.useState<ClassroomStatus>(status);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleChange() {
    if (pending) return;
    const next: ClassroomStatus = current === "active" ? "archived" : "active";
    setPending(true);
    setError(undefined);
    try {
      const result = await setClassroomStatusAction(classroomId, next);
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
      <Switch checked={current === "active"} onChange={handleChange} disabled={pending} label={current === "active" ? "Salón activo" : "Salón archivado"} />
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
