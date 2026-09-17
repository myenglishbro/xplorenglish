import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { limaWallClockToUtc, toLimaDateTimeInputValues } from "@/lib/datetime/lima";
import { useRegisterClass } from "@/features/classRecords/hooks";
import type { ClassRecordStatus } from "@/features/classRecords/types";

const STATUS_OPTIONS: { value: ClassRecordStatus; label: string }[] = [
  { value: "present", label: "Presente" },
  { value: "absent", label: "Ausente" },
  { value: "rescheduled", label: "Reprogramada" },
];

export interface RegisterClassButtonProps {
  classroomId: number;
  /** true si el salón no tiene alumno asignado -- register_class rechazaría PRESENTE/AUSENTE. */
  disabled?: boolean;
}

/**
 * Botón principal "Registrar clase" (Slice F) -- reemplaza por completo Start/Finish Class. Sin
 * cronómetro ni estado de sesión en vivo: un solo formulario con fecha/hora/estado/minutos/notas.
 */
export function RegisterClassButton({ classroomId, disabled }: RegisterClassButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<ClassRecordStatus>("present");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [minutes, setMinutes] = React.useState("60");
  const [notes, setNotes] = React.useState("");
  const [minutesError, setMinutesError] = React.useState<string | undefined>();

  // Un solo idempotencyKey por INTENTO lógico de registro: se genera al abrir el modal y se
  // reutiliza en cualquier reintento del mismo submit (nunca se regenera en cada render ni en cada
  // clic de "Guardar" mientras el modal siga abierto).
  const idempotencyKeyRef = React.useRef<string>("");

  const registerClass = useRegisterClass(classroomId);

  function handleOpen() {
    const now = toLimaDateTimeInputValues(new Date().toISOString());
    setDate(now.date);
    setTime(now.time);
    setStatus("present");
    setMinutes("60");
    setNotes("");
    setMinutesError(undefined);
    idempotencyKeyRef.current = crypto.randomUUID();
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registerClass.isPending) return;
    setMinutesError(undefined);

    const minutesValue = status === "rescheduled" ? 0 : Number(minutes);
    if (status !== "rescheduled" && (!Number.isInteger(minutesValue) || minutesValue <= 0)) {
      setMinutesError("Ingresa un número entero mayor a 0.");
      return;
    }

    const occurredAt = limaWallClockToUtc(date, time).toISOString();

    try {
      await registerClass.mutateAsync({
        classroomId,
        occurredAt,
        status,
        minutes: minutesValue,
        notes: notes.trim() || null,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setOpen(false);
    } catch {
      // el error queda en registerClass.error, se muestra debajo
    }
  }

  return (
    <>
      <Button variant="accent" icon="video-camera" onClick={handleOpen} disabled={disabled}>
        Registrar clase
      </Button>
      <Modal
        open={open}
        onClose={() => (registerClass.isPending ? undefined : setOpen(false))}
        title="Registrar clase"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={registerClass.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={registerClass.isPending}
              disabled={registerClass.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {registerClass.isError && <Alert tone="danger">{(registerClass.error as Error).message}</Alert>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)" }}>
            <Field label="Fecha" required htmlFor="registerClassDate">
              <Input id="registerClassDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={registerClass.isPending} />
            </Field>
            <Field label="Hora" required htmlFor="registerClassTime">
              <Input id="registerClassTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={registerClass.isPending} />
            </Field>
          </div>

          <Field label="Estado" required htmlFor="registerClassStatus">
            <Select
              id="registerClassStatus"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatus(e.target.value as ClassRecordStatus)}
              disabled={registerClass.isPending}
            />
          </Field>

          {status !== "rescheduled" && (
            <Field label="Minutos" required htmlFor="registerClassMinutes" error={minutesError} hint="Sin máximo -- ingresa los minutos reales dictados.">
              <Input
                id="registerClassMinutes"
                type="number"
                min={1}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                disabled={registerClass.isPending}
              />
            </Field>
          )}

          <Field label="Observaciones (opcional)" htmlFor="registerClassNotes">
            <Textarea id="registerClassNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={registerClass.isPending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
