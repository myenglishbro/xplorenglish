"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { changeSessionTeacherAction } from "@/server/scheduling/actions";

export interface ReassignTeacherButtonProps {
  sessionId: number;
  teacherOptions: { id: string; name: string }[];
}

/** change_session_teacher (0009), admin-only -- siempre SCHEDULED_TEACHER_CHANGED desde este
 * botón (ver comentario en la Server Action). Sin UI optimista: espera la respuesta real. */
export function ReassignTeacherButton({ sessionId, teacherOptions }: ReassignTeacherButtonProps) {
  const router = useRouter();
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [teacherId, setTeacherId] = React.useState("");
  const [reason, setReason] = React.useState("");

  function handleOpen() {
    setError(undefined);
    setTeacherId("");
    setReason("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!teacherId) {
      setError("Selecciona un docente.");
      return;
    }
    setPending(true);
    setError(undefined);

    const formData = new FormData();
    formData.set("newTeacherId", teacherId);
    if (reason.trim()) formData.set("reason", reason.trim());

    const result = await changeSessionTeacherAction(sessionId, formData);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  const options = [{ value: "", label: "Selecciona un docente" }, ...teacherOptions.map((t) => ({ value: t.id, label: t.name }))];

  return (
    <>
      <Button variant="ghost" size="sm" icon="arrow-clockwise" onClick={handleOpen}>
        Reasignar
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Reasignar docente"
        description="Cambia quién se espera que dicte esta sesión. Queda registrado en el historial de la sesión."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={pending}
              disabled={pending}
            >
              Reasignar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nuevo docente" required htmlFor="teacherId">
            <Select id="teacherId" value={teacherId} options={options} onChange={(e) => setTeacherId(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Motivo" htmlFor="reason">
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
