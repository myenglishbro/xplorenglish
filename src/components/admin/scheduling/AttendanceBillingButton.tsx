"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { setStudentSessionBillingAction } from "@/server/scheduling/actions";
import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from "@/server/scheduling/types";

export interface AttendanceBillingButtonProps {
  sessionId: number;
  studentId: string;
  studentName: string;
  currentStatus: AttendanceStatus;
  /** null = todavía no se decidió (ver AttendanceRosterItem) -- determina "Registrar" vs "Editar". */
  currentMinutesCharged: number | null;
  suggestedMinutes: number;
}

/**
 * set_student_session_billing (0009) es la única fuente de verdad: esta UI nunca calcula FIFO,
 * saldos, ni escribe en hours_movements -- solo junta los 3 inputs (status, minutos, nota) y
 * llama al RPC. Una corrección es exactamente la misma llamada con valores distintos; Postgres
 * decide internamente si hace falta reversión + reaplicación. Si el RPC devuelve
 * INSUFFICIENT_BALANCE, el modal se queda abierto con el mensaje tal cual y el registro visible
 * en la tabla NO cambia (no hay nada optimista que revertir).
 */
export function AttendanceBillingButton({
  sessionId,
  studentId,
  studentName,
  currentStatus,
  currentMinutesCharged,
  suggestedMinutes,
}: AttendanceBillingButtonProps) {
  const router = useRouter();
  const formId = React.useId();
  const isDecided = currentMinutesCharged !== null;
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [attendanceStatus, setAttendanceStatus] = React.useState<string>(currentStatus);
  const [minutesCharged, setMinutesCharged] = React.useState(String(currentMinutesCharged ?? suggestedMinutes));
  const [notes, setNotes] = React.useState("");

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setAttendanceStatus(isDecided ? currentStatus : "present");
    setMinutesCharged(String(currentMinutesCharged ?? suggestedMinutes));
    setNotes("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("attendanceStatus", attendanceStatus);
    formData.set("minutesCharged", minutesCharged);
    if (notes.trim()) formData.set("notes", notes.trim());

    const result = await setStudentSessionBillingAction(sessionId, studentId, formData);
    if (result.error || result.fieldErrors) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  const statusOptions = ATTENDANCE_STATUSES.map((s) => ({ value: s, label: ATTENDANCE_STATUS_LABELS[s] }));

  return (
    <>
      <Button variant={isDecided ? "ghost" : "primary"} size="sm" icon={isDecided ? "pencil-simple" : "check-circle"} onClick={handleOpen}>
        {isDecided ? "Editar" : "Registrar"}
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={`Asistencia y facturación · ${studentName}`}
        description="El servidor recalcula el consumo de paquetes (FIFO) y aplica los movimientos de horas -- nunca se calcula acá."
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
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Estado de asistencia" required htmlFor="attendanceStatus" error={fieldErrors.attendanceStatus}>
            <Select id="attendanceStatus" value={attendanceStatus} options={statusOptions} onChange={(e) => setAttendanceStatus(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Minutos a cobrar" required htmlFor="minutesCharged" error={fieldErrors.minutesCharged} hint="0 si no se le debe cobrar nada.">
            <Input
              id="minutesCharged"
              type="number"
              min={0}
              step={1}
              value={minutesCharged}
              onChange={(e) => setMinutesCharged(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={pending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
