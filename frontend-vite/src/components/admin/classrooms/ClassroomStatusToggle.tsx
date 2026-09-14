import React from "react";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { useSetClassroomStatus } from "@/features/classroomsAdmin/hooks";
import type { ClassroomStatus } from "@/server/admin/classrooms/types";

export function ClassroomStatusToggle({ classroomId, status }: { classroomId: number; status: ClassroomStatus }) {
  const mutation = useSetClassroomStatus(classroomId);
  const [current, setCurrent] = React.useState<ClassroomStatus>(status);

  async function handleChange() {
    if (mutation.isPending) return;
    const next: ClassroomStatus = current === "active" ? "archived" : "active";
    try {
      await mutation.mutateAsync(next);
      setCurrent(next);
    } catch {
      // el error ya queda en mutation.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Switch checked={current === "active"} onChange={handleChange} disabled={mutation.isPending} label={current === "active" ? "Salón activo" : "Salón archivado"} />
      {mutation.isError && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
    </div>
  );
}
