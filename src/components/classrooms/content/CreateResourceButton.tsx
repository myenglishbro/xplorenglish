"use client";

import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { isValidResourceUrl } from "@/lib/resources/providers";

export interface CreateResourceButtonProps {
  /** Fire-and-forget: nunca espera una Server Action. El caller (ContentTree) hace la creación
   * optimista y la reconciliación por su cuenta, en background. */
  onSubmit: (title: string, reference: string) => void;
}

/**
 * Título + URL, nada más -- el admin/docente nunca elige un "tipo" ni sube un archivo. El
 * servidor (createResourceAction) detecta el proveedor a partir de la URL y decide cómo se va a
 * mostrar; YouTube/Vimeo/Drive/Docs/Slides se embeben automáticamente, cualquier otra URL queda
 * como enlace con botón "Abrir recurso" en la vista del estudiante.
 *
 * Validación de URL en cliente (isValidResourceUrl, la misma función que usa el servidor) es solo
 * para UX inmediata en el modal -- la autoridad real sigue siendo `resourceSchema` server-side.
 */
export function CreateResourceButton({ onSubmit }: CreateResourceButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [titleError, setTitleError] = React.useState<string | undefined>();
  const [referenceError, setReferenceError] = React.useState<string | undefined>();

  function handleOpen() {
    setTitle("");
    setReference("");
    setTitleError(undefined);
    setReferenceError(undefined);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedReference = reference.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError("El título es obligatorio");
      hasError = true;
    } else {
      setTitleError(undefined);
    }

    if (!isValidResourceUrl(trimmedReference)) {
      setReferenceError("Ingresa una URL válida (https://…)");
      hasError = true;
    } else {
      setReferenceError(undefined);
    }

    if (hasError) return;

    onSubmit(trimmedTitle, trimmedReference);
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon="plus" onClick={handleOpen}>
        Agregar recurso
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Agregar recurso"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
            >
              Agregar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Field label="Título" required htmlFor="title" error={titleError}>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(undefined);
              }}
            />
          </Field>
          <Field
            label="URL"
            required
            htmlFor="reference"
            error={referenceError}
            hint="YouTube, Vimeo, Google Drive/Docs/Slides se muestran embebidos automáticamente. Cualquier otra URL queda como enlace."
          >
            <Input
              id="reference"
              placeholder="https://…"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setReferenceError(undefined);
              }}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
