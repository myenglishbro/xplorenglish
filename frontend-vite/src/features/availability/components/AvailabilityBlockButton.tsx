import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateAvailability, useUpdateAvailability } from "../hooks";
import { availabilityBlockSchema, type AvailabilityBlockInput } from "../validation";
import { DAY_OF_WEEK_LABELS, type AvailabilityBlockItem } from "../types";

export interface AvailabilityBlockButtonProps {
  mode: "create" | "edit";
  /** Requerido en mode="edit" (prellena el formulario); ignorado en mode="create". */
  block?: AvailabilityBlockItem;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
}

const DAY_OPTIONS = DAY_OF_WEEK_LABELS.map((label, index) => ({ value: String(index), label }));

type FieldErrors = Partial<Record<keyof AvailabilityBlockInput, string>>;

/**
 * Portado de src/components/teacher/availability/AvailabilityBlockButton.tsx (Next/Piloto 1A).
 * Diferencia real: en vez de llamar una Server Action y esperar un onSaved/refetch manual, usa
 * useMutation -- su onSuccess ya invalida la query de disponibilidad (hooks.ts), así que
 * <AvailabilityPage> se refresca solo, sin que este componente necesite saber nada de eso.
 */
export function AvailabilityBlockButton({ mode, block, triggerLabel, triggerVariant = "secondary", triggerSize = "sm", triggerIcon }: AvailabilityBlockButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [dayOfWeek, setDayOfWeek] = React.useState(String(block?.dayOfWeek ?? 1));
  const [startTime, setStartTime] = React.useState(block?.startTime.slice(0, 5) ?? "");
  const [endTime, setEndTime] = React.useState(block?.endTime.slice(0, 5) ?? "");

  const createMutation = useCreateAvailability();
  const updateMutation = useUpdateAvailability();
  const pending = createMutation.isPending || updateMutation.isPending;

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setDayOfWeek(String(block?.dayOfWeek ?? 1));
    setStartTime(block?.startTime.slice(0, 5) ?? "");
    setEndTime(block?.endTime.slice(0, 5) ?? "");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    setFieldErrors({});

    const parsed = availabilityBlockSchema.safeParse({ dayOfWeek, startTime, endTime });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errs[key as keyof AvailabilityBlockInput] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      if (mode === "edit" && block) {
        await updateMutation.mutateAsync({ id: block.id, input: parsed.data });
      } else {
        await createMutation.mutateAsync(parsed.data);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar el bloque. Inténtalo de nuevo en unos minutos.");
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
        title={mode === "edit" ? "Editar bloque de disponibilidad" : "Agregar disponibilidad"}
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
          <Field label="Día" required htmlFor="availabilityDayOfWeek" error={fieldErrors.dayOfWeek}>
            <Select id="availabilityDayOfWeek" value={dayOfWeek} options={DAY_OPTIONS} onChange={(e) => setDayOfWeek(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Hora inicio" required htmlFor="availabilityStartTime" error={fieldErrors.startTime}>
              <Input id="availabilityStartTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Hora fin" required htmlFor="availabilityEndTime" error={fieldErrors.endTime}>
              <Input id="availabilityEndTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
