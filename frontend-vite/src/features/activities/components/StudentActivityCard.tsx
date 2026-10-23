import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { Textarea } from "@/components/ui/forms/Textarea";
import { KIND_LABELS, type ActivityItem, type SubmissionItem } from "@/server/questionBank/types";
import type { Json } from "@/types/database.types";
import { useSubmitActivity } from "../hooks";
import { AudioRecorder } from "./AudioRecorder";
import { ItemView } from "./ItemView";
import { emptyAnswer, isAnswered, type ItemAnswer } from "./itemAnswers";
import { MediaEmbed, RecordingPlayer } from "./media";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function activityStatus(activity: ActivityItem, attempts: SubmissionItem[]): { label: string; tone: "neutral" | "warning" | "success" | "danger" } {
  if (attempts.length > 0) return { label: "Entregada", tone: "success" };
  if (activity.dueAt && new Date(activity.dueAt) < new Date()) return { label: "Vencida", tone: "danger" };
  return { label: "Pendiente", tone: "warning" };
}

export function StudentActivityCard({ activity, attempts }: { activity: ActivityItem; attempts: SubmissionItem[] }) {
  const [open, setOpen] = React.useState(false);
  const status = activityStatus(activity, attempts);
  const latest = attempts[0];

  return (
    <Card>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ font: "var(--weight-bold) 16px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{activity.title}</span>
            <Tag tone="accent">{KIND_LABELS[activity.kind]}</Tag>
            <Tag tone={status.tone}>{status.label}</Tag>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {activity.dueAt ? `Fecha límite: ${formatDate(activity.dueAt)}` : "Sin fecha límite"}
            {latest?.score !== null && latest?.maxScore ? ` · Último puntaje: ${latest.score}/${latest.maxScore}` : ""}
          </span>
        </div>
        <Button variant={open ? "secondary" : "primary"} size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cerrar" : attempts.length > 0 ? "Ver / reintentar" : "Empezar"}
        </Button>
      </div>

      {open && (
        <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {latest && (activity.kind === "writing" || activity.kind === "speaking") && <PreviousSubmission activityKind={activity.kind} submission={latest} />}
          <AttemptForm activity={activity} latest={latest} />
        </div>
      )}
    </Card>
  );
}

function PreviousSubmission({ activityKind, submission }: { activityKind: "writing" | "speaking"; submission: SubmissionItem }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Tu última entrega · {formatDate(submission.submittedAt)}</span>
      {activityKind === "writing" && submission.textResponse && (
        <p style={{ margin: 0, whiteSpace: "pre-wrap", padding: 12, background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>{submission.textResponse}</p>
      )}
      {activityKind === "speaking" && (submission.audioPath ? <RecordingPlayer path={submission.audioPath} /> : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>La grabación ya no está disponible.</span>)}
      {submission.feedback ? (
        <Alert tone="info" title="Feedback de tu docente">
          <span style={{ whiteSpace: "pre-wrap" }}>{submission.feedback}</span>
        </Alert>
      ) : (
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Tu docente aún no dejó feedback.</span>
      )}
    </div>
  );
}

function AttemptForm({ activity, latest }: { activity: ActivityItem; latest: SubmissionItem | undefined }) {
  const content = activity.content;
  const items = content.items ?? [];
  const submit = useSubmitActivity(activity.classroomId, activity.id);
  const [answers, setAnswers] = React.useState<ItemAnswer[]>(() => items.map(emptyAnswer));
  const [text, setText] = React.useState("");
  const [audio, setAudio] = React.useState<Blob | null>(null);
  const [recorderKey, setRecorderKey] = React.useState(0);
  const [showResults, setShowResults] = React.useState(false);

  const graded = activity.kind === "exercise" || activity.kind === "listening";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const allAnswered = items.every((it, i) => isAnswered(it, answers[i] ?? null));
  const canSubmit = graded ? allAnswered : activity.kind === "writing" ? text.trim().length > 0 : audio !== null;

  const onSubmit = () => {
    const input = graded
      ? ({ kind: activity.kind as "exercise" | "listening", answers: answers as Json[] } as const)
      : activity.kind === "writing"
        ? ({ kind: "writing", text } as const)
        : ({ kind: "speaking", audio: audio as Blob } as const);
    submit.mutate(input, {
      onSuccess: () => {
        setShowResults(true);
        if (activity.kind === "speaking") {
          setAudio(null);
          setRecorderKey((k) => k + 1);
        }
        if (activity.kind === "writing") setText("");
      },
    });
  };

  const retry = () => {
    setAnswers(items.map(emptyAnswer));
    setShowResults(false);
    submit.reset();
  };

  const showing = graded && showResults ? submit.data : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {content.instructions && <p style={{ margin: 0, color: "var(--text-muted)" }}>{content.instructions}</p>}
      {activity.kind === "listening" && content.audio_url && <MediaEmbed url={content.audio_url} type={content.media_type} />}
      {(activity.kind === "writing" || activity.kind === "speaking") && content.prompt && (
        <p style={{ margin: 0, font: "var(--weight-semibold) 16px/1.5 var(--font-body)", color: "var(--text-heading)" }}>{content.prompt}</p>
      )}

      {showing && showing.maxScore !== null && (
        <Alert tone={showing.score === showing.maxScore ? "success" : "info"} title={`Puntaje: ${showing.score}/${showing.maxScore}`}>
          Revisa las preguntas marcadas y vuelve a intentarlo si quieres mejorar tu resultado.
        </Alert>
      )}

      {graded &&
        items.map((item, i) => (
          <ItemView
            key={i}
            index={i}
            item={item}
            value={answers[i] ?? null}
            onChange={showing ? undefined : (v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
            result={showing ? showing.results?.[i] : undefined}
          />
        ))}

      {activity.kind === "writing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu respuesta aquí…" />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {words} palabras{content.min_words ? ` · mínimo sugerido: ${content.min_words}` : ""}
          </span>
        </div>
      )}

      {activity.kind === "speaking" && <AudioRecorder key={recorderKey} maxSeconds={content.max_seconds} disabled={submit.isPending} onChange={setAudio} />}

      {submit.isError && <Alert tone="danger">{submit.error.message}</Alert>}
      {submit.isSuccess && !graded && <Alert tone="success">¡Entregado! Tu docente podrá revisarlo y dejarte feedback.</Alert>}

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {showing ? (
          <Button variant="secondary" icon="arrow-counter-clockwise" onClick={retry}>
            Intentar de nuevo
          </Button>
        ) : (
          <Button onClick={onSubmit} loading={submit.isPending} disabled={!canSubmit}>
            {latest ? "Enviar nueva entrega" : "Enviar"}
          </Button>
        )}
      </div>
    </div>
  );
}
