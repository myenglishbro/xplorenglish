import React from "react";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Button } from "@/components/ui/core/Button";
import { Icon } from "@/components/ui/core/Icon";
import { Alert } from "@/components/ui/feedback/Alert";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Checkbox } from "@/components/ui/forms/Checkbox";
import { MediaEmbed } from "@/features/activities/components/media";
import { detectKnownProvider } from "@/lib/resources/providers";
import { buildPrompt, ITEM_TYPE_LABELS, LEVELS, type ItemTypeKey, type PromptMode } from "@/lib/questionBank/prompts";
import { MEDIA_PROVIDERS, parseExerciseJson } from "@/server/questionBank/validation";
import { KIND_LABELS, type ExerciseKind, type ExerciseListItem } from "@/server/questionBank/types";
import { uniqueTopics, useCreateExercise, useExercises, useUpdateExercise } from "../hooks";
import { ExercisePreview } from "./ExercisePreview";

type Step = "tipo" | "medio" | "ia" | "pegar";

const KIND_CARDS: { kind: ExerciseKind; icon: string; title: string; text: string }[] = [
  { kind: "exercise", icon: "list-checks", title: "Práctica", text: "Opción múltiple, completar espacios, verdadero/falso o emparejar." },
  { kind: "listening", icon: "headphones", title: "Listening", text: "El estudiante escucha un audio o video y responde preguntas." },
  { kind: "writing", icon: "pencil-line", title: "Writing", text: "El estudiante escribe un texto y tú le das feedback." },
  { kind: "speaking", icon: "microphone", title: "Speaking", text: "El estudiante graba su voz y tú le das feedback." },
];

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as ItemTypeKey[];
const AI_LINKS = [
  { label: "ChatGPT", href: "https://chatgpt.com" },
  { label: "Gemini", href: "https://gemini.google.com" },
  { label: "Claude", href: "https://claude.ai" },
];

const h2: React.CSSProperties = { margin: 0, font: "var(--weight-bold) 18px/1.3 var(--font-display)", color: "var(--text-heading)" };
const muted: React.CSSProperties = { margin: 0, color: "var(--text-muted)", font: "var(--weight-regular) 14px/1.5 var(--font-body)" };

function ChoiceCard({ selected, icon, title, text, onClick }: { selected: boolean; icon?: string; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "16px",
        textAlign: "left",
        cursor: "pointer",
        background: selected ? "var(--surface-accent-subtle)" : "var(--surface-card)",
        border: `${selected ? 2 : 1}px solid ${selected ? "var(--xp-cyan)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-lg)",
      }}
    >
      {icon && <Icon name={icon} size={28} color={selected ? "var(--cyan-600)" : "var(--text-muted)"} />}
      <span style={{ font: "var(--weight-bold) 16px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{title}</span>
      <span style={{ font: "var(--weight-regular) 13px/1.45 var(--font-body)", color: "var(--text-muted)" }}>{text}</span>
    </button>
  );
}

export interface ExerciseEditorModalProps {
  open: boolean;
  onClose: () => void;
  /** Si viene, se edita ese ejercicio; si no, se crea uno nuevo. */
  exercise?: ExerciseListItem;
  /** Si viene (al crear desde una categoría), se omite el paso de elegir el tipo. */
  initialKind?: ExerciseKind;
}

/** Asistente paso a paso: tipo -> (audio/video) -> instrucciones para la IA -> pegar y guardar. */
export function ExerciseEditorModal({ open, onClose, exercise, initialKind }: ExerciseEditorModalProps) {
  const { data: bank } = useExercises();
  const topicSuggestions = React.useMemo(() => uniqueTopics(bank ?? []), [bank]);
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const [step, setStep] = React.useState<Step>("tipo");
  const [kind, setKind] = React.useState<ExerciseKind>("exercise");
  const [mode, setMode] = React.useState<PromptMode>("format");
  const [level, setLevel] = React.useState("A2");
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState("8");
  const [itemTypes, setItemTypes] = React.useState<ItemTypeKey[]>(["multiple_choice", "fill_blank"]);
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [mediaType, setMediaType] = React.useState<"audio" | "video">("audio");
  const [transcript, setTranscript] = React.useState("");
  const [raw, setRaw] = React.useState("");
  const [copied, setCopied] = React.useState<"prompt" | "fix" | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const c = exercise?.content;
    setKind(exercise?.kind ?? initialKind ?? "exercise");
    setStep(exercise ? (exercise.kind === "listening" ? "medio" : "pegar") : initialKind ? (initialKind === "listening" ? "medio" : "ia") : "tipo");
    setMode("format");
    setLevel(c?.level && LEVELS.includes(c.level) ? c.level : "A2");
    setTopic(c?.topic ?? "");
    setRaw(exercise ? JSON.stringify(c, null, 2) : "");
    setMediaUrl(c?.kind === "listening" ? c.audio_url : "");
    setMediaType(c?.kind === "listening" ? (c.media_type ?? "audio") : "audio");
    setTranscript(c?.kind === "listening" ? (c.transcript ?? "") : "");
    setCopied(null);
    create.reset();
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise?.id, initialKind]);

  const isListening = kind === "listening";
  const effectiveMode: PromptMode = isListening ? "format" : mode;
  const steps: Step[] = [...(exercise || initialKind ? [] : (["tipo"] as Step[])), ...(isListening ? (["medio"] as Step[]) : []), ...(exercise ? [] : (["ia"] as Step[])), "pegar"];
  const stepIndex = steps.indexOf(step);
  const prompt = buildPrompt({ mode: effectiveMode, kind, level, topic, count: Math.min(Math.max(Number(count) || 5, 1), 30), itemTypes });

  const mediaProvider = detectKnownProvider(mediaUrl.trim());
  const mediaValid = !!mediaProvider && MEDIA_PROVIDERS.includes(mediaProvider.type);

  // Validación automática: se revisa sola cada vez que cambia la respuesta pegada.
  const check = React.useMemo(() => {
    if (!raw.trim()) return null;
    const result = parseExerciseJson(raw, isListening ? { audio_url: mediaUrl.trim(), media_type: mediaType, transcript: transcript.trim() } : undefined);
    if (result.ok && result.content.kind !== kind) {
      return { ok: false as const, errors: [`Elegiste "${KIND_LABELS[kind]}", pero lo que pegaste es de tipo "${KIND_LABELS[result.content.kind]}". Vuelve atrás y elige el tipo correcto, o genera de nuevo.`] };
    }
    return result;
  }, [raw, isListening, mediaUrl, mediaType, transcript, kind]);

  const mutation = exercise ? update : create;

  const copy = async (text: string, which: "prompt" | "fix") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  };

  const save = () => {
    if (!check?.ok) return;
    const onSuccess = () => onClose();
    // Nivel y tema los define el docente en el formulario, no lo que devuelva la IA.
    const content = { ...check.content, level, topic: topic.trim() || undefined };
    if (exercise) update.mutate({ id: exercise.id, content }, { onSuccess });
    else create.mutate(content, { onSuccess });
  };

  const canNext = step === "medio" ? mediaValid : true;
  const goBack = () => setStep(steps[Math.max(stepIndex - 1, 0)] as Step);
  const goNext = () => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)] as Step);
  const toggleType = (t: ItemTypeKey) => setItemTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const fixMessage = check && !check.ok ? `Tu respuesta tiene estos problemas, corrígelos y vuelve a responder solo con el JSON completo:\n- ${check.errors.join("\n- ")}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={720}
      title={exercise ? "Editar ejercicio" : "Nuevo ejercicio"}
      description={steps.length > 1 ? `Paso ${stepIndex + 1} de ${steps.length}` : undefined}
      footer={
        <>
          {stepIndex > 0 ? (
            <Button variant="ghost" icon="arrow-left" onClick={goBack}>
              Atrás
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          )}
          {step === "pegar" ? (
            <Button icon="check" onClick={save} loading={mutation.isPending} disabled={!check?.ok}>
              {exercise ? "Guardar cambios" : "Guardar en el banco"}
            </Button>
          ) : (
            <Button iconRight="arrow-right" onClick={goNext} disabled={!canNext}>
              Siguiente
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {steps.length > 1 && (
          <div style={{ display: "flex", gap: 6 }} aria-hidden>
            {steps.map((s, i) => (
              <span key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIndex ? "var(--xp-cyan)" : "var(--border-default)" }} />
            ))}
          </div>
        )}

        {step === "tipo" && (
          <>
            <h2 style={h2}>¿Qué tipo de actividad quieres crear?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-3)" }}>
              {KIND_CARDS.map((c) => (
                <ChoiceCard key={c.kind} selected={kind === c.kind} icon={c.icon} title={c.title} text={c.text} onClick={() => setKind(c.kind)} />
              ))}
            </div>
          </>
        )}

        {step === "medio" && (
          <>
            <h2 style={h2}>Agrega tu audio o video</h2>
            <p style={muted}>Súbelo a Google Drive, YouTube o Vimeo y pega aquí el enlace.</p>
            <Field
              label="Enlace"
              hint='En Google Drive: clic derecho en el archivo → Compartir → "Cualquier persona con el enlace".'
              error={mediaUrl.trim() && !mediaValid ? "No reconocemos este enlace. Debe ser de Google Drive, YouTube o Vimeo." : undefined}
            >
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Pega el enlace aquí" />
            </Field>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              {(["audio", "video"] as const).map((t) => (
                <Button key={t} size="sm" variant={mediaType === t ? "primary" : "secondary"} icon={t === "audio" ? "headphones" : "video-camera"} onClick={() => setMediaType(t)}>
                  {t === "audio" ? "Es un audio" : "Es un video"}
                </Button>
              ))}
            </div>
            {mediaValid && (
              <>
                <MediaEmbed url={mediaUrl.trim()} type={mediaType} />
                <span style={{ ...muted, fontSize: 13 }}>Si aquí se reproduce, tus estudiantes también lo podrán escuchar.</span>
              </>
            )}
            <Field label="Texto del audio (opcional)" hint="Solo lo verás tú; tus estudiantes no lo reciben.">
              <Textarea rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Si tienes el script del audio, pégalo aquí" />
            </Field>
          </>
        )}

        {step === "ia" && (
          <>
            <h2 style={h2}>Prepara tu material con la IA</h2>
            {!isListening && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-3)" }}>
                <ChoiceCard selected={mode === "format"} title="Ya tengo mis preguntas" text="La IA solo las ordena. No cambia nada de lo que escribiste." onClick={() => setMode("format")} />
                <ChoiceCard selected={mode === "generate"} title="Quiero que la IA las cree" text="Tú eliges el tema y el nivel; la IA propone el ejercicio." onClick={() => setMode("generate")} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
              <Field label="Nivel de tus estudiantes">
                <Select value={level} options={LEVELS} onChange={(e) => setLevel(e.target.value)} />
              </Field>
              {effectiveMode === "generate" && kind === "exercise" && (
                <Field label="¿Cuántas preguntas?">
                  <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} />
                </Field>
              )}
            </div>
            {effectiveMode === "generate" && (
              <Field label="¿Sobre qué tema?" hint="Por ejemplo: rutinas diarias, viajes, pasado simple…">
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Escribe el tema" />
              </Field>
            )}
            {effectiveMode === "generate" && kind === "exercise" && (
              <Field label="¿Qué tipos de pregunta?">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
                  {ITEM_TYPES.map((t) => (
                    <Checkbox key={t} label={ITEM_TYPE_LABELS[t]} checked={itemTypes.includes(t)} onChange={() => toggleType(t)} />
                  ))}
                </div>
              </Field>
            )}

            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, font: "var(--weight-regular) 14px/1.5 var(--font-body)", color: "var(--text-body)" }}>
              <li>
                <Button size="sm" icon={copied === "prompt" ? "check" : "copy"} onClick={() => copy(prompt, "prompt")}>
                  {copied === "prompt" ? "¡Copiado!" : "Copiar instrucciones para la IA"}
                </Button>
              </li>
              <li>
                Ábrela en tu asistente favorito:{" "}
                {AI_LINKS.map((l, i) => (
                  <React.Fragment key={l.href}>
                    {i > 0 && " · "}
                    <a href={l.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan-700)", fontWeight: 600 }}>
                      {l.label}
                    </a>
                  </React.Fragment>
                ))}
                , pega las instrucciones
                {effectiveMode === "format" ? (
                  <>
                    {" "}
                    y, al final donde dice <b>MATERIAL:</b>, pega tus preguntas y respuestas tal como las tienes
                  </>
                ) : null}
                .
              </li>
              <li>Copia la respuesta de la IA y pásala al siguiente paso.</li>
            </ol>
            <details>
              <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>Ver las instrucciones</summary>
              <Textarea rows={8} value={prompt} readOnly style={{ marginTop: 8, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
            </details>
          </>
        )}

        {step === "pegar" && (
          <>
            <h2 style={h2}>{exercise ? "Contenido del ejercicio" : "Pega aquí la respuesta de la IA"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
              <Field label="Nivel">
                <Select value={level} options={LEVELS} onChange={(e) => setLevel(e.target.value)} />
              </Field>
              <Field label="Tema" hint="Sirve para agrupar y filtrar al asignar. Ej: Pasado simple, Viajes.">
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Escribe o elige un tema" list="exercise-topics" />
                <datalist id="exercise-topics">
                  {topicSuggestions.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Textarea
              rows={check?.ok ? 5 : 9}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Pega aquí lo que te respondió la IA (se revisa automáticamente)"
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
            />

            {check && !check.ok && (
              <Alert
                tone="danger"
                title="Casi listo, pero hay algo por corregir"
                action={
                  <Button size="sm" variant="secondary" icon={copied === "fix" ? "check" : "copy"} onClick={() => copy(fixMessage, "fix")}>
                    {copied === "fix" ? "¡Copiado!" : "Copiar mensaje para pedirle a la IA que lo corrija"}
                  </Button>
                }
              >
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {check.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {check?.ok && (
              <>
                <Alert tone="success" title="¡Todo correcto!">
                  Así lo verán tus estudiantes. Las respuestas correctas aparecen en verde solo para ti.
                </Alert>
                <div style={{ padding: "var(--space-4)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ font: "var(--weight-bold) 17px/1.3 var(--font-display)", color: "var(--text-heading)", marginBottom: "var(--space-3)" }}>{check.content.title}</div>
                  <ExercisePreview content={check.content} />
                </div>
              </>
            )}
            {mutation.isError && <Alert tone="danger">{mutation.error.message}</Alert>}
          </>
        )}
      </div>
    </Modal>
  );
}
