import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";

export interface TitleDescriptionFieldErrors {
  title?: string;
  description?: string;
}

export interface TitleDescriptionFormButtonProps {
  modalTitle: string;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
  defaultTitle?: string;
  defaultDescription?: string | null;
  /** Lanza `{ fieldErrors }` si la validación server-side falla (mismo contrato que el resto de
   * mutaciones del proyecto) -- este componente lo captura y lo muestra, sin conocer el schema. */
  onSubmit: (input: { title: string; description?: string }) => Promise<void>;
}

/**
 * Genérico para módulo y lección -- ambos son, en Next y acá, exactamente los mismos dos campos
 * (título obligatorio + descripción opcional). Espejo del patrón ya establecido en
 * ClassScheduleBlockButton/ProgramsPanel: botón disparador + Modal con formulario, sin UI
 * optimista (se espera la respuesta real antes de cerrar).
 */
export function TitleDescriptionFormButton({
  modalTitle,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
  defaultTitle = "",
  defaultDescription,
  onSubmit,
}: TitleDescriptionFormButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<TitleDescriptionFieldErrors>({});

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      await onSubmit({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: TitleDescriptionFieldErrors }).fieldErrors);
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setPending(false);
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
        title={modalTitle}
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
          <Field label="Título" required htmlFor="title" error={fieldErrors.title}>
            <Input id="title" name="title" defaultValue={defaultTitle} disabled={pending} />
          </Field>
          <Field label="Descripción" htmlFor="description" error={fieldErrors.description}>
            <Textarea id="description" name="description" defaultValue={defaultDescription ?? ""} disabled={pending} rows={3} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
