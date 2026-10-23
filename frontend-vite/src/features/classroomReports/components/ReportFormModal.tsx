import React from "react";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Button } from "@/components/ui/core/Button";
import { Icon } from "@/components/ui/core/Icon";
import { Alert } from "@/components/ui/feedback/Alert";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Textarea } from "@/components/ui/forms/Textarea";
import { SKILLS, type ReportItem } from "@/server/classroomReports/types";
import type { ReportInput } from "@/server/classroomReports/validation";
import { useSaveReport, type ReportFieldErrors } from "../hooks";

const EMPTY: Required<ReportInput> = { title: "", summary: "", speaking_comment: "", writing_comment: "", listening_comment: "", reading_comment: "", comments: "" };

function toForm(r?: ReportItem): Required<ReportInput> {
  if (!r) return EMPTY;
  return {
    title: r.title,
    summary: r.summary ?? "",
    speaking_comment: r.skills.speaking ?? "",
    writing_comment: r.skills.writing ?? "",
    listening_comment: r.skills.listening ?? "",
    reading_comment: r.skills.reading ?? "",
    comments: r.comments ?? "",
  };
}

function fieldErrorsOf(error: unknown): ReportFieldErrors | null {
  return error && typeof error === "object" && "fieldErrors" in error ? (error as { fieldErrors: ReportFieldErrors }).fieldErrors : null;
}

export interface ReportFormModalProps {
  classroomId: number;
  open: boolean;
  onClose: () => void;
  /** Si viene, se edita ese reporte. */
  report?: ReportItem;
}

export function ReportFormModal({ classroomId, open, onClose, report }: ReportFormModalProps) {
  const save = useSaveReport(classroomId);
  const [form, setForm] = React.useState<Required<ReportInput>>(EMPTY);

  React.useEffect(() => {
    if (open) {
      setForm(toForm(report));
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, report?.id]);

  const set = (key: keyof ReportInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const errors = fieldErrorsOf(save.error);
  const genericError = save.isError && !errors ? (save.error as Error).message : null;

  const submit = (published: boolean) => save.mutate({ id: report?.id, input: form, published }, { onSuccess: onClose });
  const wasPublished = report?.published ?? false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={720}
      title={report ? "Editar reporte" : "Nuevo reporte"}
      description="Tu estudiante verá este reporte en la pestaña Reportes cuando lo publiques."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {wasPublished ? (
            <>
              <Button variant="secondary" loading={save.isPending} onClick={() => submit(false)}>
                Volver a borrador
              </Button>
              <Button loading={save.isPending} onClick={() => submit(true)}>
                Guardar cambios
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" loading={save.isPending} onClick={() => submit(false)}>
                Guardar borrador
              </Button>
              <Button icon="paper-plane-tilt" loading={save.isPending} onClick={() => submit(true)}>
                Publicar
              </Button>
            </>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Field label="Título" required error={errors?.title} hint='Ej.: "Reporte de octubre" o "Avance del módulo 2"'>
          <Input value={form.title} onChange={set("title")} placeholder="Título del reporte" invalid={!!errors?.title} />
        </Field>

        <Field label="Resumen general" error={errors?.summary} hint="Cómo va el estudiante en general: avances, actitud, logros.">
          <Textarea rows={4} value={form.summary} onChange={set("summary")} invalid={!!errors?.summary} />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span style={{ font: "var(--weight-bold) 15px/1.3 var(--font-display)", color: "var(--text-heading)" }}>Comentarios por habilidad</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
            {SKILLS.map((s) => (
              <Field
                key={s.key}
                label={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name={s.icon} size={16} color="var(--cyan-600)" /> {s.label}
                  </span>
                }
                hint={s.hint}
              >
                <Textarea rows={4} value={form[`${s.key}_comment` as const]} onChange={set(`${s.key}_comment` as const)} />
              </Field>
            ))}
          </div>
        </div>

        <Field label="Comentarios y recomendaciones" hint="Próximos pasos, qué practicar en casa, mensaje final.">
          <Textarea rows={4} value={form.comments} onChange={set("comments")} />
        </Field>

        {genericError && <Alert tone="danger">{genericError}</Alert>}
      </div>
    </Modal>
  );
}
