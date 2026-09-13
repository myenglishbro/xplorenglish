"use client";

import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";

export interface TitleDescriptionButtonProps {
  triggerLabel: string;
  triggerIcon?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  modalTitle: string;
  submitLabel: string;
  defaultTitle?: string;
  defaultDescription?: string | null;
  /** Fire-and-forget: nunca espera una Server Action. El caller (ContentTree) hace la
   * actualización optimista y la reconciliación por su cuenta, en background. */
  onSubmit: (title: string, description: string | null) => void;
}

/**
 * Reemplaza a TitleDescriptionFormModal (eliminado en este bloque -- quedó sin ningún caller una
 * vez que crear/editar módulo y crear/editar lección pasaron a ser optimistas). Usado para las 4
 * operaciones: crear módulo, editar módulo, crear lección, editar lección -- mismo par de campos
 * en las 4. Cierra el modal de inmediato al enviar, sin esperar ningún resultado de red.
 */
export function TitleDescriptionButton({
  triggerLabel,
  triggerIcon,
  triggerVariant = "secondary",
  triggerSize = "md",
  modalTitle,
  submitLabel,
  defaultTitle,
  defaultDescription,
  onSubmit,
}: TitleDescriptionButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(defaultTitle ?? "");
  const [description, setDescription] = React.useState(defaultDescription ?? "");
  const [titleError, setTitleError] = React.useState<string | undefined>();

  function handleOpen() {
    setTitle(defaultTitle ?? "");
    setDescription(defaultDescription ?? "");
    setTitleError(undefined);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("El título es obligatorio");
      return;
    }

    onSubmit(trimmedTitle, description.trim() ? description.trim() : null);
    setOpen(false);
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={handleOpen}>
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}>
              {submitLabel}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit}>
          <Field label="Título" required htmlFor={`${formId}-title`} error={titleError}>
            <Input
              id={`${formId}-title`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(undefined);
              }}
            />
          </Field>
          <Field label="Descripción" htmlFor={`${formId}-description`} style={{ marginTop: "var(--space-4)" }}>
            <Input id={`${formId}-description`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
