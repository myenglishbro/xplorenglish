import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateInstitutionalDocument, useUpdateInstitutionalDocument, type InstitutionalDocumentFieldErrors } from "@/features/institutionalDocuments/hooks";
import type { InstitutionalDocumentItem, InstitutionalDocumentType } from "@/server/institutionalDocuments/types";

export interface DocumentFormButtonProps {
  mode: "create" | "edit";
  documentType: InstitutionalDocumentType;
  /** Requerido en mode="edit" (prellena el formulario); ignorado en mode="create". */
  document?: InstitutionalDocumentItem;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
}

/** Alta/edición de un documento institucional -- título + URL + publicado. Sin editor rich text,
 * sin categorías: exactamente el modelo mínimo pedido (institutional_documents). */
export function DocumentFormButton({ mode, documentType, document, triggerLabel, triggerVariant = "secondary", triggerSize = "md", triggerIcon }: DocumentFormButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(document?.title ?? "");
  const [url, setUrl] = React.useState(document?.url ?? "");
  const [isPublished, setIsPublished] = React.useState(document?.isPublished ?? false);
  const [fieldErrors, setFieldErrors] = React.useState<InstitutionalDocumentFieldErrors>({});

  const createDocument = useCreateInstitutionalDocument(documentType);
  const updateDocument = useUpdateInstitutionalDocument(document?.id ?? -1, documentType);
  const mutation = mode === "create" ? createDocument : updateDocument;

  function handleOpen() {
    setTitle(document?.title ?? "");
    setUrl(document?.url ?? "");
    setIsPublished(document?.isPublished ?? false);
    setFieldErrors({});
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    try {
      await mutation.mutateAsync({ title, url, isPublished });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: InstitutionalDocumentFieldErrors }).fieldErrors);
      }
    }
  }

  const generalError = mutation.isError && !(mutation.error && typeof mutation.error === "object" && "fieldErrors" in mutation.error) ? (mutation.error as Error).message : null;

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={handleOpen}>
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title={mode === "create" ? "Agregar documento" : "Editar documento"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (window.document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {generalError && <Alert tone="danger">{generalError}</Alert>}

          <Field label="Título" required htmlFor="documentTitle" error={fieldErrors.title}>
            <Input id="documentTitle" value={title} onChange={(e) => setTitle(e.target.value)} disabled={mutation.isPending} />
          </Field>

          <Field label="URL" required htmlFor="documentUrl" error={fieldErrors.url} hint="Google Drive, Docs, Slides, PDF u otro enlace público.">
            <Input id="documentUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={mutation.isPending} placeholder="https://…" />
          </Field>

          <div>
            <Switch
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={mutation.isPending}
              label={isPublished ? "Publicado" : "Sin publicar"}
            />
            <p style={{ margin: "6px 0 0", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
              Solo los documentos publicados son visibles para Teacher/Student.
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}
