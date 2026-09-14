import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { useSetStudentSessionBilling, type BillingFieldErrors } from "@/features/schedulingAdmin/hooks";
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
 * llama al RPC. Una corrección es exactamente la misma llamada con valores distintos. Si el RPC
 * devuelve INSUFFICIENT_BALANCE, el modal se queda abierto con el mensaje tal cual y el registro
 * visible en la tabla NO cambia (no hay nada optimista que revertir).
 */
export function AttendanceBillingButton({
  sessionId,
  studentId,
  studentName,
  currentStatus,
  currentMinutesCharged,
  suggestedMinutes,
}: AttendanceBillingButtonProps) {
  const mutation = useSetStudentSessionBilling(sessionId);
  const formId = React.useId();
  const isDecided = currentMinutesCharged !== null;
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<BillingFieldErrors>({});
  const [attendanceStatus, setAttendanceStatus] = React.useState<string>(currentStatus);
  const [minutesCharged, setMinutesCharged] = React.useState(String(currentMinutesCharged ?? suggestedMinutes));
  const [notes, setNotes] = React.useState("");

  function handleOpen() {
    setFieldErrors({});
    setAttendanceStatus(isDecided ? currentStatus : "present");
    setMinutesCharged(String(currentMinutesCharged ?? suggestedMinutes));
    setNotes("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    try {
      await mutation.mutateAsync({
        studentId,
        attendanceStatus: attendanceStatus as AttendanceStatus,
        minutesCharged: Number(minutesCharged),
        notes: notes.trim(),
      });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: BillingFieldErrors }).fieldErrors);
      }
    }
  }

  const statusOptions = ATTENDANCE_STATUSES.map((s) => ({ value: s, label: ATTENDANCE_STATUS_LABELS[s] }));

  return (
    <>
      <Button variant={isDecided ? "ghost" : "primary"} size="sm" icon={isDecided ? "pencil-simple" : "check-circle"} onClick={handleOpen}>
        {isDecided ? "Editar" : "Registrar"}
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title={`Asistencia y facturación · ${studentName}`}
        description="El servidor recalcula el consumo de paquetes (FIFO) y aplica los movimientos de horas -- nunca se calcula acá."
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
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
          <Field label="Estado de asistencia" required htmlFor="attendanceStatus" error={fieldErrors.attendanceStatus}>
            <Select id="attendanceStatus" value={attendanceStatus} options={statusOptions} onChange={(e) => setAttendanceStatus(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <Field label="Minutos a cobrar" required htmlFor="minutesCharged" error={fieldErrors.minutesCharged} hint="0 si no se le debe cobrar nada.">
            <Input
              id="minutesCharged"
              type="number"
              min={0}
              step={1}
              value={minutesCharged}
              onChange={(e) => setMinutesCharged(e.target.value)}
              disabled={mutation.isPending}
            />
          </Field>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={mutation.isPending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
