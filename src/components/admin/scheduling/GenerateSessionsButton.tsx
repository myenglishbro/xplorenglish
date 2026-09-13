"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { previewGeneratedSessionsAction, generateSessionsAction, type GenerateSessionsResult } from "@/server/scheduling/actions";
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

/**
 * Flujo pedido: elegir salón + rango de fechas -> previsualizar -> confirmar. duplicate/conflict
 * NUNCA se crean, ni al confirmar -- generateSessionsAction vuelve a calcular el preview completo
 * en el momento de insertar (defensivo contra una segunda pestaña/admin generando en paralelo) y
 * solo inserta lo que sigue siendo "create" en ese instante. Sin selección fila por fila ni
 * override masivo en esta fase.
 */
export function GenerateSessionsButton({ classrooms }: GenerateSessionsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pendingPreview, setPendingPreview] = React.useState(false);
  const [pendingConfirm, setPendingConfirm] = React.useState(false);
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

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.set("classroomId", classroomId);
    formData.set("dateFrom", dateFrom);
    formData.set("dateTo", dateTo);
    return formData;
  }

  async function handlePreview() {
    if (pendingPreview) return;
    setPendingPreview(true);
    setError(undefined);
    setResult(null);

    const response = await previewGeneratedSessionsAction(buildFormData());
    if (response.error || !response.data) {
      setError(response.error ?? Object.values(response.fieldErrors ?? {})[0] ?? "No pudimos generar la previsualización.");
      setPreview(null);
      setPendingPreview(false);
      return;
    }
    setPreview(response.data);
    setPendingPreview(false);
  }

  async function handleConfirm() {
    if (pendingConfirm) return;
    setPendingConfirm(true);
    setError(undefined);

    const response = await generateSessionsAction(buildFormData());
    if (response.error || !response.data) {
      setError(response.error ?? "No pudimos generar las sesiones.");
      setPendingConfirm(false);
      return;
    }
    setResult(response.data);
    setPreview(null);
    setPendingConfirm(false);
    // Con inserciones, la action ya revalida el calendario. Si otra operación dejó
    // solo duplicados/conflictos, retorna sin revalidar: conservamos ese refresh.
    if (response.data.created === 0) router.refresh();
  }

  const classroomOptions = [{ value: "", label: "Selecciona un salón" }, ...classrooms.map((c) => ({ value: String(c.id), label: c.name }))];
  const canPreview = classroomId && dateFrom && dateTo;
  const createCount = preview?.filter((p) => p.outcome === "create").length ?? 0;

  return (
    <>
      <Button variant="secondary" size="sm" icon="magic-wand" onClick={handleOpen}>
        Generar sesiones
      </Button>
      <Modal
        open={open}
        onClose={() => (pendingPreview || pendingConfirm ? undefined : setOpen(false))}
        title="Generar sesiones desde horarios"
        description="Se generan sesiones concretas a partir de los horarios semanales activos del salón, dentro del rango elegido."
        width={640}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pendingPreview || pendingConfirm}>
              Cerrar
            </Button>
            {preview && createCount > 0 && (
              <Button variant="primary" onClick={handleConfirm} loading={pendingConfirm} disabled={pendingConfirm}>
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
              disabled={pendingPreview || pendingConfirm}
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
                disabled={pendingPreview || pendingConfirm}
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
                disabled={pendingPreview || pendingConfirm}
              />
            </Field>
          </div>

          <div>
            <Button variant="secondary" size="sm" onClick={handlePreview} loading={pendingPreview} disabled={!canPreview || pendingPreview}>
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
