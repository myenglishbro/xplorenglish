import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import type { ReportItem } from "@/server/classroomReports/types";
import { useClassroomReports, useDeleteReport } from "../hooks";
import { ReportFormModal } from "./ReportFormModal";
import { ReportView } from "./ReportView";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { dateStyle: "long" });
}

export interface ClassroomReportsSectionProps {
  classroomId: number;
  /** Docente: crea/edita/publica. Estudiante y admin: solo lectura (admin ve también borradores). */
  role: "teacher" | "student" | "admin";
}

export function ClassroomReportsSection({ classroomId, role }: ClassroomReportsSectionProps) {
  const { data, isLoading, isError } = useClassroomReports(classroomId);
  const del = useDeleteReport(classroomId);
  const [editing, setEditing] = React.useState<ReportItem | undefined>();
  const [creating, setCreating] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);
  const [openIds, setOpenIds] = React.useState<Set<number>>(new Set());
  const canEdit = role === "teacher";
  const reports = data ?? [];

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {canEdit && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button icon="plus" onClick={() => setCreating(true)}>
            Nuevo reporte
          </Button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando reportes…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar los reportes de este salón.</Alert>
      ) : reports.length === 0 ? (
        <EmptyState icon="clipboard-text" title="Aún no hay reportes">
          {canEdit ? "Escribe un reporte con tus comentarios sobre speaking, writing, listening y reading. Tu estudiante lo verá aquí." : role === "student" ? "Tu docente publicará aquí sus reportes sobre tu avance." : "Los docentes de este salón aún no han escrito reportes."}
        </EmptyState>
      ) : (
        reports.map((r, i) => {
          // El más reciente se muestra abierto por defecto; el resto, plegado.
          const open = openIds.has(r.id) !== (i === 0);
          return (
            <Card key={r.id}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-expanded={open}
                  style={{ display: "flex", flexDirection: "column", gap: 4, border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer", flex: "1 1 240px" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ font: "var(--weight-bold) 17px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{r.title}</span>
                    {canEdit || role === "admin" ? <Tag tone={r.published ? "success" : "warning"}>{r.published ? "Publicado" : "Borrador"}</Tag> : null}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{r.publishedAt ? `Publicado el ${formatDate(r.publishedAt)}` : `Creado el ${formatDate(r.createdAt)}`}</span>
                </button>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Button variant="secondary" size="sm" icon="pencil-simple" onClick={() => setEditing(r)}>
                      Editar
                    </Button>
                    {confirmId === r.id ? (
                      <>
                        <Button variant="danger" size="sm" loading={del.isPending} onClick={() => del.mutate(r.id, { onSuccess: () => setConfirmId(null) })}>
                          Confirmar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" icon="trash" aria-label="Eliminar reporte" onClick={() => setConfirmId(r.id)} />
                    )}
                  </div>
                )}
              </div>
              {confirmId === r.id && (
                <Alert tone="warning" style={{ marginTop: "var(--space-3)" }}>
                  El reporte se eliminará también para el estudiante. Esta acción no se puede deshacer.
                </Alert>
              )}
              {del.isError && confirmId === r.id && (
                <Alert tone="danger" style={{ marginTop: "var(--space-3)" }}>
                  {del.error.message}
                </Alert>
              )}
              {open && (
                <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                  <ReportView report={r} />
                </div>
              )}
            </Card>
          );
        })
      )}

      {canEdit && (
        <>
          <ReportFormModal classroomId={classroomId} open={creating} onClose={() => setCreating(false)} />
          <ReportFormModal classroomId={classroomId} open={!!editing} report={editing} onClose={() => setEditing(undefined)} />
        </>
      )}
    </div>
  );
}
