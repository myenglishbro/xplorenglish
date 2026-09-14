import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { useReassignTeacher } from "@/features/schedulingAdmin/hooks";

export interface ReassignTeacherButtonProps {
  sessionId: number;
  teacherOptions: { id: string; name: string }[];
}

/** change_session_teacher (0009), admin-only -- siempre SCHEDULED_TEACHER_CHANGED desde este
 * botón. Sin UI optimista: espera la respuesta real. */
export function ReassignTeacherButton({ sessionId, teacherOptions }: ReassignTeacherButtonProps) {
  const formId = React.useId();
  const mutation = useReassignTeacher(sessionId);
  const [open, setOpen] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | undefined>();
  const [teacherId, setTeacherId] = React.useState("");
  const [reason, setReason] = React.useState("");

  function handleOpen() {
    setLocalError(undefined);
    setTeacherId("");
    setReason("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!teacherId) {
      setLocalError("Selecciona un docente.");
      return;
    }
    setLocalError(undefined);
    try {
      await mutation.mutateAsync({ newTeacherId: teacherId, reason: reason.trim() });
      setOpen(false);
    } catch {
      // el error ya queda en mutation.error, se muestra abajo
    }
  }

  const options = [{ value: "", label: "Selecciona un docente" }, ...teacherOptions.map((t) => ({ value: t.id, label: t.name }))];
  const error = localError ?? (mutation.isError ? (mutation.error as Error).message : undefined);

  return (
    <>
      <Button variant="ghost" size="sm" icon="arrow-clockwise" onClick={handleOpen}>
        Reasignar
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Reasignar docente"
        description="Cambia quién se espera que dicte esta sesión. Queda registrado en el historial de la sesión."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Reasignar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nuevo docente" required htmlFor="teacherId">
            <Select id="teacherId" value={teacherId} options={options} onChange={(e) => setTeacherId(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <Field label="Motivo" htmlFor="reason">
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={mutation.isPending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
