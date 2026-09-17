import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateClassSchedule, useUpdateClassSchedule, type ClassScheduleFieldErrors } from "@/features/schedulingAdmin/hooks";
import { classScheduleSchema, type ClassScheduleInput } from "@/server/scheduling/validation";
import { DAY_OF_WEEK_LABELS, type ClassScheduleItem } from "@/server/scheduling/types";

export interface ClassScheduleBlockButtonProps {
  mode: "create" | "edit";
  classroomId: number;
  /** Requerido en mode="edit" (prellena el formulario); ignorado en mode="create". */
  schedule?: ClassScheduleItem;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
}

const DAY_OPTIONS = DAY_OF_WEEK_LABELS.map((label, index) => ({ value: String(index), label }));

/** Alta/edición de un bloque de class_schedules (día/inicio/fin) -- horario semanal REFERENCIAL de
 * un salón, distinto de teacher_availability (ver features/availability/components/WeeklyAvailabilityGrid). */
export function ClassScheduleBlockButton({
  mode,
  classroomId,
  schedule,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
}: ClassScheduleBlockButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<ClassScheduleFieldErrors>({});
  const [dayOfWeek, setDayOfWeek] = React.useState(String(schedule?.dayOfWeek ?? 1));
  const [startTime, setStartTime] = React.useState(schedule?.startTime.slice(0, 5) ?? "");
  const [endTime, setEndTime] = React.useState(schedule?.endTime.slice(0, 5) ?? "");

  const createMutation = useCreateClassSchedule(classroomId);
  const updateMutation = useUpdateClassSchedule(schedule?.id ?? -1, classroomId);
  const mutation = mode === "edit" ? updateMutation : createMutation;
  const pending = mutation.isPending;

  function handleOpen() {
    setFieldErrors({});
    setDayOfWeek(String(schedule?.dayOfWeek ?? 1));
    setStartTime(schedule?.startTime.slice(0, 5) ?? "");
    setEndTime(schedule?.endTime.slice(0, 5) ?? "");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFieldErrors({});

    const parsed = classScheduleSchema.safeParse({ dayOfWeek, startTime, endTime });
    if (!parsed.success) {
      const errs: ClassScheduleFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errs[key as keyof ClassScheduleInput] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      await mutation.mutateAsync(parsed.data);
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ClassScheduleFieldErrors }).fieldErrors);
      }
    }
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={handleOpen}>
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={mode === "edit" ? "Editar horario" : "Agregar horario"}
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
          {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
          <Field label="Día" required htmlFor="classScheduleDayOfWeek" error={fieldErrors.dayOfWeek}>
            <Select id="classScheduleDayOfWeek" value={dayOfWeek} options={DAY_OPTIONS} onChange={(e) => setDayOfWeek(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)" }}>
            <Field label="Hora inicio" required htmlFor="classScheduleStartTime" error={fieldErrors.startTime}>
              <Input id="classScheduleStartTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Hora fin" required htmlFor="classScheduleEndTime" error={fieldErrors.endTime}>
              <Input id="classScheduleEndTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
