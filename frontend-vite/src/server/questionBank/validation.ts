import { z } from "zod";
import { detectKnownProvider } from "@/lib/resources/providers";

/**
 * Formato JSON de un ejercicio del banco -- es el contrato entre los prompts que se le dan al
 * docente (lib/questionBank/prompts.ts), lo que pega en el importador y lo que guarda la DB
 * (exercises.content). `answer` vive dentro de cada item en el banco; assign_exercise (0048) lo
 * separa en activity_answer_keys para que el estudiante nunca lo reciba.
 */

const text = (label: string) => z.string({ required_error: `${label} es obligatorio` }).trim().min(1, `${label} no puede estar vacío`);

const multipleChoiceItem = z
  .object({
    type: z.literal("multiple_choice"),
    prompt: text("La pregunta"),
    options: z.array(text("La opción")).min(2, "Una pregunta de opción múltiple necesita al menos 2 opciones").max(6, "Máximo 6 opciones"),
    answer: z.number().int(),
  })
  .refine((v) => v.answer >= 0 && v.answer < v.options.length, {
    path: ["answer"],
    message: "answer debe ser el índice (desde 0) de una de las opciones",
  });

const trueFalseItem = z.object({
  type: z.literal("true_false"),
  prompt: text("La afirmación"),
  answer: z.boolean(),
});

/** Cada "___" del prompt es un hueco; `answer` trae una respuesta por hueco y admite alternativas
 * separadas por "|" (ej. "isn't|is not"). */
const fillBlankItem = z
  .object({
    type: z.literal("fill_blank"),
    prompt: text("La oración"),
    answer: z.array(text("La respuesta")).min(1, "Falta al menos una respuesta"),
  })
  .refine((v) => (v.prompt.match(/___/g) ?? []).length === v.answer.length, {
    path: ["answer"],
    message: 'La cantidad de respuestas debe coincidir con la cantidad de "___" del prompt',
  });

/** answer[i] = posición en `right` que corresponde a left[i]. */
const matchingItem = z
  .object({
    type: z.literal("matching"),
    prompt: z.string().trim().optional(),
    left: z.array(text("El elemento")).min(2, "Empareja al menos 2 elementos").max(10),
    right: z.array(text("El elemento")).min(2).max(10),
    answer: z.array(z.number().int()),
  })
  .refine((v) => v.left.length === v.right.length, { path: ["right"], message: "left y right deben tener la misma cantidad de elementos" })
  .refine((v) => v.answer.length === v.left.length && new Set(v.answer).size === v.answer.length && v.answer.every((n) => n >= 0 && n < v.right.length), {
    path: ["answer"],
    message: "answer debe tener un índice distinto de right por cada elemento de left",
  });

/** Varias respuestas correctas: `answer` = índices (desde 0) de TODAS las opciones correctas. */
const multipleSelectItem = z
  .object({
    type: z.literal("multiple_select"),
    prompt: text("La pregunta"),
    options: z.array(text("La opción")).min(3, "Necesita al menos 3 opciones").max(8, "Máximo 8 opciones"),
    answer: z.array(z.number().int()).min(1, "Marca al menos una respuesta correcta"),
  })
  .refine((v) => new Set(v.answer).size === v.answer.length && v.answer.every((n) => n >= 0 && n < v.options.length), {
    path: ["answer"],
    message: "answer debe listar índices distintos de las opciones correctas (desde 0)",
  });

/** Ordenar piezas (palabras de una oración o frases de un texto): `parts` va desordenado y
 * `answer[i]` es el índice en `parts` de la pieza que va en la posición i. */
const orderingItem = z
  .object({
    type: z.literal("ordering"),
    prompt: z.string().trim().optional(),
    parts: z.array(text("La pieza")).min(2, "Necesita al menos 2 piezas").max(12, "Máximo 12 piezas"),
    answer: z.array(z.number().int()),
  })
  .refine((v) => v.answer.length === v.parts.length && new Set(v.answer).size === v.answer.length && v.answer.every((n) => n >= 0 && n < v.parts.length), {
    path: ["answer"],
    message: "answer debe usar cada pieza de parts exactamente una vez (índices desde 0)",
  });

/** Respuesta escrita corta: `answer` lista las respuestas aceptadas (también admite "a|b"). */
const shortAnswerItem = z.object({
  type: z.literal("short_answer"),
  prompt: text("La pregunta"),
  answer: z.array(text("La respuesta")).min(1, "Falta al menos una respuesta aceptada"),
});

/** Clasificar elementos en categorías: `answer[i]` es el índice en `categories` del elemento items[i]. */
const categorizeItem = z
  .object({
    type: z.literal("categorize"),
    prompt: z.string().trim().optional(),
    categories: z.array(text("La categoría")).min(2, "Necesita al menos 2 categorías").max(6, "Máximo 6 categorías"),
    items: z.array(text("El elemento")).min(2, "Necesita al menos 2 elementos").max(12, "Máximo 12 elementos"),
    answer: z.array(z.number().int()),
  })
  .refine((v) => v.answer.length === v.items.length && v.answer.every((n) => n >= 0 && n < v.categories.length), {
    path: ["answer"],
    message: "answer debe tener un índice de categoría (desde 0) por cada elemento de items",
  });

export const itemSchema = z.union([multipleChoiceItem, trueFalseItem, fillBlankItem, matchingItem, multipleSelectItem, orderingItem, shortAnswerItem, categorizeItem]);

const base = {
  title: text("El título"),
  instructions: z.string().trim().optional(),
  level: z.string().trim().optional(),
};

const itemsSchema = z.array(itemSchema).min(1, "Incluye al menos una pregunta").max(50, "Máximo 50 preguntas por ejercicio");

const writingSchema = z.object({
  ...base,
  kind: z.literal("writing"),
  prompt: text("El tema (prompt)"),
  min_words: z.number().int().positive().optional(),
});

const speakingSchema = z.object({
  ...base,
  kind: z.literal("speaking"),
  prompt: text("El tema (prompt)"),
  max_seconds: z.number().int().positive().max(600).optional(),
});

export const MEDIA_PROVIDERS = ["drive", "youtube", "vimeo"];

const listeningSchema = z.object({
  ...base,
  kind: z.literal("listening"),
  // La URL y el tipo de medio los completa el formulario del editor (no el JSON de la IA).
  audio_url: z
    .string({ required_error: "Falta la URL del audio o video" })
    .trim()
    .refine((v) => MEDIA_PROVIDERS.includes(detectKnownProvider(v)?.type ?? "docs"), "La URL debe ser de Google Drive, YouTube o Vimeo"),
  media_type: z.enum(["audio", "video"]).optional(),
  /** Guion del audio, solo para que el docente lo grabe/lea; assign_exercise no lo copia al salón. */
  transcript: z.string().trim().optional(),
  items: itemsSchema,
});

const exerciseSchema = z.object({
  ...base,
  kind: z.literal("exercise"),
  items: itemsSchema,
});

export const exerciseContentSchema = z.discriminatedUnion("kind", [writingSchema, speakingSchema, listeningSchema, exerciseSchema]);

/** Ver `parseExerciseJson`: convierte el texto pegado en contenido válido o en errores legibles. */
export type ParseExerciseResult = { ok: true; content: z.infer<typeof exerciseContentSchema> } | { ok: false; errors: string[] };

/** `overrides`: campos que el formulario aporta fuera del JSON (URL del medio, script); pisan lo que traiga el JSON. */
export function parseExerciseJson(raw: string, overrides?: Record<string, unknown>): ParseExerciseResult {
  const cleaned = raw
    .trim()
    // Los chatbots suelen envolver el JSON en ```json … ``` -- se tolera para no frustrar al docente.
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!cleaned) return { ok: false, errors: ["Pega el JSON generado antes de continuar."] };

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return { ok: false, errors: ["Eso no es un JSON válido. Copia la respuesta completa del asistente, desde { hasta }."] };
  }

  if (overrides && json && typeof json === "object" && !Array.isArray(json)) {
    const defined = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined && v !== ""));
    json = { ...json, ...defined };
  }

  const parsed = exerciseContentSchema.safeParse(json);
  if (parsed.success) return { ok: true, content: parsed.data };

  const errors = parsed.error.issues.slice(0, 8).map((issue) => {
    const where = issue.path.length ? issue.path.map((p) => (typeof p === "number" ? `#${p + 1}` : p)).join(" › ") : "JSON";
    if (issue.code === "invalid_union_discriminator") return 'El campo "kind" debe ser writing, speaking, listening o exercise.';
    if (issue.code === "invalid_union") return `${where}: el tipo de pregunta no es válido (usa multiple_choice, true_false, fill_blank, matching, multiple_select, ordering, short_answer o categorize) o le faltan campos.`;
    return `${where}: ${issue.message}`;
  });
  return { ok: false, errors };
}
