"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { toLimaDateTimeInputValues } from "@/lib/datetime/lima";
import { rescheduleSessionAction } from "@/server/scheduling/actions";

export interface RescheduleSessionButtonProps {
  sessionId: number;
  classroomId: number;
  scheduledStart: string;
  scheduledEnd: string;
  teacherOptions: { id: string; name: string }[];
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
}

/**
 * Usado tanto por admin (calendario) como por el docente dueño de la sesión (mis clases) -- el
 * componente no distingue rol, la autoridad real es reschedule_session (0009), que valida si el
 * caller puede reprogramar ESTA sesión. Sin UI optimista: el modal se queda abierto con loading
 * hasta la respuesta real del RPC.
 */
export function RescheduleSessionButton({
  sessionId,
  classroomId,
  scheduledStart,
  scheduledEnd,
  teacherOptions,
  triggerVariant = "secondary",
  triggerSize = "sm",
}: RescheduleSessionButtonProps) {
  const router = useRouter();
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const startParts = toLimaDateTimeInputValues(scheduledStart);
  const endParts = toLimaDateTimeInputValues(scheduledEnd);

  const [date, setDate] = React.useState(startParts.date);
  const [startTime, setStartTime] = React.useState(startParts.time);
  const [endTime, setEndTime] = React.useState(endParts.time);
  const [newTeacherId, setNewTeacherId] = React.useState("");
  const [reason, setReason] = React.useState("");

  function handleOpen() {
    setError(undefined);
    setDate(startParts.date);
    setStartTime(startParts.time);
    setEndTime(endParts.time);
    setNewTeacherId("");
    setReason("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);

    const formData = new FormData();
    formData.set("date", date);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    if (newTeacherId) formData.set("newTeacherId", newTeacherId);
    if (reason.trim()) formData.set("reason", reason.trim());

    const result = await rescheduleSessionAction(sessionId, classroomId, formData);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  const teacherSelectOptions = [{ value: "", label: "Mismo docente" }, ...teacherOptions.map((t) => ({ value: t.id, label: t.name }))];

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon="calendar-blank" onClick={handleOpen}>
        Reprogramar
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Reprogramar sesión"
        description="La sesión original queda marcada como reprogramada; se crea una sesión nueva con el horario elegido. El historial no se pierde."
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
              Reprogramar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Fecha" required htmlFor="date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Hora de inicio" required htmlFor="startTime">
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Hora de fin" required htmlFor="endTime">
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
            </Field>
          </div>
          <Field label="Docente" htmlFor="newTeacherId" hint="Déjalo en 'Mismo docente' si no cambia.">
            <Select id="newTeacherId" value={newTeacherId} options={teacherSelectOptions} onChange={(e) => setNewTeacherId(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Motivo" htmlFor="reason">
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
