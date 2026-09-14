import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { usePreviewGeneratedSessions, useGenerateSessions, type GenerateSessionsResult } from "@/features/schedulingAdmin/hooks";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { ClassroomOption, GeneratedSessionPreviewItem } from "@/server/scheduling/types";

export interface GenerateSessionsButtonProps {
  classrooms: ClassroomOption[];
}

const OUTCOME_LABEL: Record<GeneratedSessionPreviewItem["outcome"], string> = {
  create: "Se creará",
  duplicate: "Ya existe",
  conflict: "Conflicto",
};

const OUTCOME_TONE: Record<GeneratedSessionPreviewItem["outcome"], TagTone> = {
  create: "success",
  duplicate: "neutral",
  conflict: "danger",
};

function errorMessageFrom(err: unknown): string {
  if (err && typeof err === "object" && "fieldErrors" in err) {
    const first = Object.values((err as { fieldErrors: Record<string, string> }).fieldErrors)[0];
    if (first) return first;
  }
  if (err instanceof Error) return err.message;
  return "No pudimos completar la operación.";
}

/**
 * Flujo: elegir salón + rango de fechas -> previsualizar -> confirmar. duplicate/conflict NUNCA
 * se crean, ni al confirmar -- useGenerateSessions vuelve a calcular el preview completo en el
 * momento de insertar (defensivo contra una segunda pestaña/admin generando en paralelo) y solo
 * inserta lo que sigue siendo "create" en ese instante. Sin selección fila por fila en esta fase.
 */
export function GenerateSessionsButton({ classrooms }: GenerateSessionsButtonProps) {
  const previewMutation = usePreviewGeneratedSessions();
  const generateMutation = useGenerateSessions();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [classroomId, setClassroomId] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [preview, setPreview] = React.useState<GeneratedSessionPreviewItem[] | null>(null);
  const [result, setResult] = React.useState<GenerateSessionsResult | null>(null);

  function handleOpen() {
    setError(undefined);
    setClassroomId("");
    setDateFrom("");
    setDateTo("");
    setPreview(null);
    setResult(null);
    setOpen(true);
  }

  async function handlePreview() {
    if (previewMutation.isPending) return;
    setError(undefined);
    setResult(null);
    try {
      const data = await previewMutation.mutateAsync({ classroomId: Number(classroomId), dateFrom, dateTo });
      setPreview(data);
    } catch (err) {
      setError(errorMessageFrom(err));
      setPreview(null);
    }
  }

  async function handleConfirm() {
    if (generateMutation.isPending) return;
    setError(undefined);
    try {
      const data = await generateMutation.mutateAsync({ classroomId: Number(classroomId), dateFrom, dateTo });
      setResult(data);
      setPreview(null);
    } catch (err) {
      setError(errorMessageFrom(err));
    }
  }

  const classroomOptions = [{ value: "", label: "Selecciona un salón" }, ...classrooms.map((c) => ({ value: String(c.id), label: c.name }))];
  const canPreview = classroomId && dateFrom && dateTo;
  const createCount = preview?.filter((p) => p.outcome === "create").length ?? 0;
  const pending = previewMutation.isPending || generateMutation.isPending;

  return (
    <>
      <Button variant="secondary" size="sm" icon="magic-wand" onClick={handleOpen}>
        Generar sesiones
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Generar sesiones desde horarios"
        description="Se generan sesiones concretas a partir de los horarios semanales activos del salón, dentro del rango elegido."
        width={640}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cerrar
            </Button>
            {preview && createCount > 0 && (
              <Button variant="primary" onClick={handleConfirm} loading={generateMutation.isPending} disabled={pending}>
                Confirmar generación ({createCount})
              </Button>
            )}
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          {result && (
            <Alert tone="success" title="Generación completada">
              {result.created} creada(s) · {result.duplicates} ya existente(s) · {result.conflicts} omitida(s) por conflicto.
            </Alert>
          )}

          <Field label="Salón" htmlFor="genClassroomId">
            <Select
              id="genClassroomId"
              value={classroomId}
              options={classroomOptions}
              onChange={(e) => {
                setClassroomId(e.target.value);
                setPreview(null);
              }}
              disabled={pending}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Desde" htmlFor="genDateFrom">
              <Input
                id="genDateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPreview(null);
                }}
                disabled={pending}
              />
            </Field>
            <Field label="Hasta" htmlFor="genDateTo">
              <Input
                id="genDateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPreview(null);
                }}
                disabled={pending}
              />
            </Field>
          </div>

          <div>
            <Button variant="secondary" size="sm" onClick={handlePreview} loading={previewMutation.isPending} disabled={!canPreview || pending}>
              Previsualizar
            </Button>
          </div>

          {preview && (
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {preview.length === 0 ? (
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
                  Ninguna fecha en el rango elegido coincide con los horarios activos de este salón.
                </span>
              ) : (
                preview.map((item, index) => (
                  <div
                    key={`${item.classScheduleId}-${item.scheduledStart}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 12px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-body-sm-size)" }}>
                      {formatShortDateInLima(item.scheduledStart)} · {formatTimeInLima(item.scheduledStart)}–{formatTimeInLima(item.scheduledEnd)}
                      {item.outcome === "conflict" && item.conflictReason && (
                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>{item.conflictReason}</span>
                      )}
                    </span>
                    <Tag tone={OUTCOME_TONE[item.outcome]} size="sm">
                      {OUTCOME_LABEL[item.outcome]}
                    </Tag>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
