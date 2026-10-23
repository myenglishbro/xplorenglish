import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { Textarea } from "@/components/ui/forms/Textarea";
import { KIND_LABELS, type ActivityItem, type SubmissionItem } from "@/server/questionBank/types";
import { useDeleteActivity, useGiveFeedback } from "../hooks";
import { RecordingPlayer } from "./media";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

export function TeacherActivityCard({ activity, submissions }: { activity: ActivityItem; submissions: SubmissionItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const del = useDeleteActivity(activity.classroomId);
  const isFeedbackKind = activity.kind === "writing" || activity.kind === "speaking";
  const pending = isFeedbackKind ? submissions.filter((s) => !s.feedback).length : 0;
  const best = submissions.reduce<number | null>((acc, s) => (s.score !== null && (acc === null || s.score > acc) ? s.score : acc), null);
  const max = submissions.find((s) => s.maxScore !== null)?.maxScore ?? null;

  return (
    <Card>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ font: "var(--weight-bold) 16px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{activity.title}</span>
            <Tag tone="accent">{KIND_LABELS[activity.kind]}</Tag>
            {pending > 0 && <Tag tone="warning">{pending} sin feedback</Tag>}
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {activity.dueAt ? `Fecha límite: ${formatDate(activity.dueAt)}` : "Sin fecha límite"} · {submissions.length === 0 ? "Sin entregas" : `${submissions.length} ${submissions.length === 1 ? "entrega" : "entregas"}`}
            {best !== null && max !== null ? ` · Mejor puntaje: ${best}/${max}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Ocultar" : "Ver entregas"}
          </Button>
          {confirmDelete ? (
            <>
              <Button variant="danger" size="sm" loading={del.isPending} onClick={() => del.mutate(activity.id)}>
                Confirmar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" icon="trash" onClick={() => setConfirmDelete(true)} aria-label="Eliminar actividad" />
          )}
        </div>
      </div>
      {confirmDelete && (
        <Alert tone="warning" style={{ marginTop: "var(--space-3)" }}>
          Se eliminará la actividad junto con sus entregas, audios y feedback. Esta acción no se puede deshacer.
        </Alert>
      )}
      {del.isError && <Alert tone="danger" style={{ marginTop: "var(--space-3)" }}>{del.error.message}</Alert>}

      {open && (
        <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {submissions.length === 0 ? (
            <span style={{ color: "var(--text-muted)" }}>El estudiante todavía no ha entregado esta actividad.</span>
          ) : (
            submissions.map((s) => <SubmissionRow key={s.id} activity={activity} submission={s} classroomId={activity.classroomId} />)
          )}
        </div>
      )}
    </Card>
  );
}

function SubmissionRow({ activity, submission, classroomId }: { activity: ActivityItem; submission: SubmissionItem; classroomId: number }) {
  const feedbackKind = activity.kind === "writing" || activity.kind === "speaking";
  const give = useGiveFeedback(classroomId);
  const [draft, setDraft] = React.useState(submission.feedback ?? "");
  const dirty = draft.trim() !== (submission.feedback ?? "");
  const late = activity.dueAt !== null && new Date(submission.submittedAt) > new Date(activity.dueAt);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{formatDate(submission.submittedAt)}</span>
        {late && <Tag tone="danger" size="sm">Tarde</Tag>}
        {submission.score !== null && submission.maxScore !== null && <Tag tone={submission.score === submission.maxScore ? "success" : "neutral"} size="sm">{submission.score}/{submission.maxScore}</Tag>}
      </div>
      {activity.kind === "writing" && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{submission.textResponse}</p>}
      {activity.kind === "speaking" &&
        (submission.audioPath ? <RecordingPlayer path={submission.audioPath} /> : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>El audio fue eliminado.</span>)}
      {feedbackKind && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe tu feedback para el estudiante…" />
          {give.isError && <Alert tone="danger">{give.error.message}</Alert>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button size="sm" loading={give.isPending} disabled={!dirty || draft.trim().length === 0} onClick={() => give.mutate({ submissionId: submission.id, feedback: draft })}>
              {submission.feedback ? "Actualizar feedback" : "Enviar feedback"}
            </Button>
            {submission.feedbackAt && !dirty && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Enviado {formatDate(submission.feedbackAt)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
