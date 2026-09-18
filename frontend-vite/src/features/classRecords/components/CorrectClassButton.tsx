import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { limaWallClockToUtc, toLimaDateTimeInputValues } from "@/lib/datetime/lima";
import { useCorrectClass } from "@/features/classRecords/hooks";
import type { ClassRecordHistoryItem, ClassRecordStatus } from "@/features/classRecords/types";

const STATUS_OPTIONS: { value: ClassRecordStatus; label: string }[] = [
  { value: "present", label: "Presente" },
  { value: "absent", label: "Ausente" },
  { value: "rescheduled", label: "Reprogramada" },
];

export interface CorrectClassButtonProps {
  classroomId: number;
  record: ClassRecordHistoryItem;
}

/**
 * "Corregir" (Slice F) -- solo visible para el profesor que registró la clase (ver
 * ClassRecordHistoryTable, que decide cuándo renderizar este botón). Si ya está pagada, el backend
 * (correct_class) solo permite cambiar notes; la UI refleja la misma regla bloqueando estado/minutos
 * en vez de solo confiar en el rechazo del servidor.
 */
export function CorrectClassButton({ classroomId, record }: CorrectClassButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<ClassRecordStatus>(record.status);
  const [minutes, setMinutes] = React.useState(String(record.minutes));
  const [notes, setNotes] = React.useState(record.notes ?? "");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [minutesError, setMinutesError] = React.useState<string | undefined>();

  const isPaid = record.teacherPaymentId !== null;
  const correctClass = useCorrectClass(classroomId);

  function handleOpen() {
    const initial = toLimaDateTimeInputValues(record.occurredAt);
    setStatus(record.status);
    setMinutes(String(record.minutes));
    setNotes(record.notes ?? "");
    setDate(initial.date);
    setTime(initial.time);
    setMinutesError(undefined);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (correctClass.isPending) return;
    setMinutesError(undefined);

    const minutesValue = isPaid ? record.minutes : status === "rescheduled" ? 0 : Number(minutes);
    if (!isPaid && status !== "rescheduled" && (!Number.isInteger(minutesValue) || minutesValue <= 0)) {
      setMinutesError("Ingresa un número entero mayor a 0.");
      return;
    }

    try {
      await correctClass.mutateAsync({
        classRecordId: record.id,
        status: isPaid ? record.status : status,
        minutes: minutesValue,
        notes: notes.trim() || null,
        occurredAt: isPaid ? undefined : limaWallClockToUtc(date, time).toISOString(),
      });
      setOpen(false);
    } catch {
      // el error queda en correctClass.error, se muestra debajo
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpen}>
        Corregir
      </Button>
      <Modal
        open={open}
        onClose={() => (correctClass.isPending ? undefined : setOpen(false))}
        title="Corregir clase"
        description={isPaid ? "Esta clase ya fue pagada -- solo puedes editar la observación." : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={correctClass.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={correctClass.isPending}
              disabled={correctClass.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {correctClass.isError && <Alert tone="danger">{(correctClass.error as Error).message}</Alert>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)" }}>
            <Field label="Fecha" required htmlFor="correctClassDate">
              <Input
                id="correctClassDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={correctClass.isPending || isPaid}
              />
            </Field>
            <Field label="Hora" required htmlFor="correctClassTime">
              <Input
                id="correctClassTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={correctClass.isPending || isPaid}
              />
            </Field>
          </div>

          <Field label="Estado" required htmlFor="correctClassStatus">
            <Select
              id="correctClassStatus"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatus(e.target.value as ClassRecordStatus)}
              disabled={correctClass.isPending || isPaid}
            />
          </Field>

          {status !== "rescheduled" && (
            <Field label="Minutos" required htmlFor="correctClassMinutes" error={minutesError}>
              <Input
                id="correctClassMinutes"
                type="number"
                min={1}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                disabled={correctClass.isPending || isPaid}
              />
            </Field>
          )}

          <Field label="Observaciones (opcional)" htmlFor="correctClassNotes">
            <Textarea id="correctClassNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={correctClass.isPending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
