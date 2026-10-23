import React from "react";
import { Alert } from "@/components/ui/feedback/Alert";
import { Button } from "@/components/ui/core/Button";
import { Textarea } from "@/components/ui/forms/Textarea";
import { AudioRecorder } from "@/features/activities/components/AudioRecorder";
import { ItemView } from "@/features/activities/components/ItemView";
import { emptyAnswer, isAnswered, type ItemAnswer } from "@/features/activities/components/itemAnswers";
import { MediaEmbed } from "@/features/activities/components/media";
import type { ExerciseContent } from "@/server/questionBank/types";
import { gradeItemLocally } from "../clientGrade";

/**
 * Cómo lo vería el estudiante: sin respuestas correctas, sin el guion del audio y con los mismos
 * controles. El docente puede responder y comprobar; nada se guarda ni se envía.
 */
export function StudentPreview({ content }: { content: ExerciseContent }) {
  const items = content.kind === "exercise" || content.kind === "listening" ? content.items : [];
  const [answers, setAnswers] = React.useState<ItemAnswer[]>(() => items.map(emptyAnswer));
  const [results, setResults] = React.useState<boolean[] | null>(null);
  const [text, setText] = React.useState("");

  // Si cambia el ejercicio mostrado, se reinicia el intento.
  React.useEffect(() => {
    setAnswers(items.map(emptyAnswer));
    setResults(null);
    setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const graded = content.kind === "exercise" || content.kind === "listening";
  const allAnswered = items.every((it, i) => isAnswered(it, answers[i] ?? null));
  const score = results ? results.filter(Boolean).length : 0;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const check = () => setResults(items.map((it, i) => gradeItemLocally(it, answers[i] ?? null)));
  const retry = () => {
    setAnswers(items.map(emptyAnswer));
    setResults(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Alert tone="info">Vista previa: puedes responder y comprobar como si fueras el estudiante. Nada de esto se guarda.</Alert>

      {content.instructions && <p style={{ margin: 0, color: "var(--text-muted)" }}>{content.instructions}</p>}
      {content.kind === "listening" && <MediaEmbed url={content.audio_url} type={content.media_type} />}
      {(content.kind === "writing" || content.kind === "speaking") && (
        <p style={{ margin: 0, font: "var(--weight-semibold) 16px/1.5 var(--font-body)", color: "var(--text-heading)" }}>{content.prompt}</p>
      )}

      {results && (
        <Alert tone={score === items.length ? "success" : "info"} title={`Puntaje: ${score}/${items.length}`}>
          Así verá el estudiante su resultado: solo se marcan las preguntas acertadas o falladas, sin mostrar la respuesta correcta.
        </Alert>
      )}

      {graded &&
        items.map((item, i) => (
          <ItemView
            key={i}
            index={i}
            item={item}
            value={answers[i] ?? null}
            onChange={results ? undefined : (v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
            result={results ? results[i] : undefined}
          />
        ))}

      {content.kind === "writing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu respuesta aquí…" />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {words} palabras{content.min_words ? ` · mínimo sugerido: ${content.min_words}` : ""}
          </span>
        </div>
      )}

      {content.kind === "speaking" && <AudioRecorder maxSeconds={content.max_seconds} onChange={() => undefined} />}

      {graded &&
        (results ? (
          <div>
            <Button variant="secondary" icon="arrow-counter-clockwise" onClick={retry}>
              Intentar de nuevo
            </Button>
          </div>
        ) : (
          <div>
            <Button onClick={check} disabled={!allAnswered}>
              Comprobar respuestas
            </Button>
          </div>
        ))}
    </div>
  );
}
