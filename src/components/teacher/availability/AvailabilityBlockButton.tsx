"use client";

import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { createAvailabilityBlockAction, updateAvailabilityBlockAction, type AvailabilityBlockActionState } from "@/server/teacher/availability/actions";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";
import type { AvailabilityBlockItem } from "@/server/teacher/availability/types";

export interface AvailabilityBlockButtonProps {
  mode: "create" | "edit";
  /** Requerido en mode="edit" (prellena el formulario); ignorado en mode="create". */
  block?: AvailabilityBlockItem;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
  /** PILOTO 1A: la action ya no revalida la ruta -- el caller (page.tsx, con su propio estado
   * client-side) vuelve a pedir los bloques al Supabase Browser Client tras un guardado exitoso. */
  onSaved: () => void | Promise<void>;
}

const DAY_OPTIONS = DAY_OF_WEEK_LABELS.map((label, index) => ({ value: String(index), label }));

/**
 * Un solo componente para "Agregar disponibilidad" y "Editar" -- misma modal y formulario; la
 * única diferencia es qué Server Action se llama al guardar (create vs update). Sin UI
 * optimista: el modal se queda abierto con loading hasta la respuesta real del server.
 */
export function AvailabilityBlockButton({ mode, block, triggerLabel, triggerVariant = "secondary", triggerSize = "sm", triggerIcon, onSaved }: AvailabilityBlockButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<AvailabilityBlockActionState>({});
  const [dayOfWeek, setDayOfWeek] = React.useState(String(block?.dayOfWeek ?? 1));
  const [startTime, setStartTime] = React.useState(block?.startTime.slice(0, 5) ?? "");
  const [endTime, setEndTime] = React.useState(block?.endTime.slice(0, 5) ?? "");

  function handleOpen() {
    setState({});
    setDayOfWeek(String(block?.dayOfWeek ?? 1));
    setStartTime(block?.startTime.slice(0, 5) ?? "");
    setEndTime(block?.endTime.slice(0, 5) ?? "");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});

    const formData = new FormData();
    formData.set("dayOfWeek", dayOfWeek);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);

    const result = mode === "edit" && block ? await updateAvailabilityBlockAction(block.id, formData) : await createAvailabilityBlockAction(formData);

    if (result.error || result.fieldErrors) {
      setState(result);
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    await onSaved();
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
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <Field label="Día" required htmlFor="availabilityDayOfWeek" error={state.fieldErrors?.dayOfWeek}>
            <Select id="availabilityDayOfWeek" value={dayOfWeek} options={DAY_OPTIONS} onChange={(e) => setDayOfWeek(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Hora inicio" required htmlFor="availabilityStartTime" error={state.fieldErrors?.startTime}>
              <Input id="availabilityStartTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Hora fin" required htmlFor="availabilityEndTime" error={state.fieldErrors?.endTime}>
              <Input id="availabilityEndTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
