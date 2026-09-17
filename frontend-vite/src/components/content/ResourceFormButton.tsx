import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { detectKnownProvider } from "@/lib/resources/providers";

export interface ResourceFieldErrors {
  title?: string;
  reference?: string;
}

export interface ResourceFormButtonProps {
  modalTitle: string;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
  defaultTitle?: string;
  defaultReference?: string;
  onSubmit: (input: { title: string; reference: string }) => Promise<void>;
}

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "Video de YouTube",
  vimeo: "Video de Vimeo",
  drive: "Documento de Google Drive",
  docs: "Documento de Google Docs",
  slides: "Presentación de Google Slides",
};

/**
 * `type` nunca se pide en este formulario -- se deriva de `reference` en el hook (deriveResourceType,
 * mismo detectKnownProvider que ya usa el visor del estudiante). El hint de abajo del campo URL es
 * puramente informativo (recalculado en cada tecla), nunca se envía como valor: solo le confirma al
 * admin/docente qué proveedor detectó la app antes de guardar.
 */
export function ResourceFormButton({
  modalTitle,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
  defaultTitle = "",
  defaultReference = "",
  onSubmit,
}: ResourceFormButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<ResourceFieldErrors>({});
  const [reference, setReference] = React.useState(defaultReference);

  const detected = reference.trim() ? detectKnownProvider(reference.trim()) : null;

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setReference(defaultReference);
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
        reference: String(formData.get("reference") ?? ""),
      });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ResourceFieldErrors }).fieldErrors);
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
          <Field
            label="URL"
            required
            htmlFor="reference"
            error={fieldErrors.reference}
            hint={
              detected
                ? `Detectado: ${PROVIDER_LABEL[detected.type]}`
                : reference.trim()
                  ? "No es un proveedor conocido -- se guardará como enlace externo."
                  : "Pega un enlace de YouTube, Vimeo, Google Drive, Docs, Slides, o cualquier otra URL."
            }
          >
            <Input
              id="reference"
              name="reference"
              type="url"
              icon="link-simple"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={pending}
              placeholder="https://…"
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
