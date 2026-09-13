"use client";

import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { isValidResourceUrl } from "@/lib/resources/providers";
import type { ResourceItem } from "@/server/classrooms/content/types";

export interface EditResourceButtonProps {
  resource: ResourceItem;
  /** Fire-and-forget: nunca espera una Server Action. El caller (ContentTree) aplica el cambio
   * optimista y reconcilia (o hace rollback) por su cuenta, en background. */
  onSubmit: (title: string, reference: string) => void;
}

/** Título y URL siempre editables -- `type` se recalcula server-side a partir de la URL nueva
 * (ver updateResourceAction), nunca se envía ni se conserva desde el cliente. Soporta cambiar de
 * proveedor (ej. YouTube -> Drive) en la misma edición. */
export function EditResourceButton({ resource, onSubmit }: EditResourceButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(resource.title);
  const [reference, setReference] = React.useState(resource.reference);
  const [titleError, setTitleError] = React.useState<string | undefined>();
  const [referenceError, setReferenceError] = React.useState<string | undefined>();

  function handleOpen() {
    setTitle(resource.title);
    setReference(resource.reference);
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
      <Button variant="ghost" size="sm" icon="pencil-simple" onClick={handleOpen}>
        Editar
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar recurso"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
            >
              Guardar
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
          <Field label="URL" required htmlFor="reference" error={referenceError}>
            <Input
              id="reference"
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
