import React from "react";
import { ItemView } from "@/features/activities/components/ItemView";
import { MediaEmbed } from "@/features/activities/components/media";
import { Tabs } from "@/components/ui/navigation/Tabs";
import type { ExerciseContent } from "@/server/questionBank/types";
import { StudentPreview } from "./StudentPreview";

type View = "docente" | "estudiante";

/** Vista del docente: igual a lo que verá el estudiante, pero con la respuesta correcta marcada. */
function TeacherView({ content }: { content: ExerciseContent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {content.instructions && <p style={{ margin: 0, color: "var(--text-muted)" }}>{content.instructions}</p>}
      {content.kind === "listening" && (
        <>
          <MediaEmbed url={content.audio_url} type={content.media_type} />
          {content.transcript && (
            <details>
              <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>Guion del audio (solo docentes)</summary>
              <p style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{content.transcript}</p>
            </details>
          )}
        </>
      )}
      {(content.kind === "writing" || content.kind === "speaking") && (
        <p style={{ margin: 0, font: "var(--weight-semibold) 16px/1.5 var(--font-body)", color: "var(--text-heading)" }}>{content.prompt}</p>
      )}
      {content.kind === "writing" && content.min_words && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Mínimo sugerido: {content.min_words} palabras</span>}
      {content.kind === "speaking" && content.max_seconds && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Duración máxima: {content.max_seconds} segundos</span>}
      {(content.kind === "exercise" || content.kind === "listening") &&
        content.items.map((item, i) => <ItemView key={i} index={i} item={item} value={null} correct={item.answer} />)}
    </div>
  );
}

/** Vista previa con interruptor: "Vista docente" (respuestas correctas visibles) o "Vista estudiante" (interactiva). */
export function ExercisePreview({ content }: { content: ExerciseContent }) {
  const [view, setView] = React.useState<View>("docente");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Tabs
        items={[
          { value: "docente", label: "Vista docente" },
          { value: "estudiante", label: "Vista estudiante" },
        ]}
        value={view}
        onChange={(v) => setView(v as View)}
      />
      {view === "docente" ? <TeacherView content={content} /> : <StudentPreview content={content} />}
    </div>
  );
}
