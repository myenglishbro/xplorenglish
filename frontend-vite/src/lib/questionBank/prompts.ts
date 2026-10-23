import type { ExerciseKind } from "@/server/questionBank/types";

/**
 * Prompts que se le entregan al docente para producir el JSON de un ejercicio con cualquier
 * asistente de IA. El JSON que devuelve se pega en el importador y se valida con parseExerciseJson
 * (server/questionBank/validation.ts) -- si cambia el formato allá, se cambia acá.
 *
 * Dos modos (listening solo admite "format"):
 *  - "format" (principal): el docente YA tiene preguntas y respuestas; la IA solo las convierte al
 *    formato, sin inventar ni modificar nada.
 *  - "generate": la IA crea el material desde un tema.
 * La URL del audio/video y el guion de listening NUNCA van en el JSON: los aporta el formulario.
 */

export type PromptMode = "format" | "generate";

export type PromptOptions = {
  mode: PromptMode;
  kind: ExerciseKind;
  level: string;
  /** Solo mode="generate". */
  topic: string;
  count: number;
  itemTypes: ItemTypeKey[];
};

export type ItemTypeKey = "multiple_choice" | "multiple_select" | "true_false" | "fill_blank" | "short_answer" | "matching" | "ordering" | "categorize";

export const ITEM_TYPE_LABELS: Record<ItemTypeKey, string> = {
  multiple_choice: "Opción múltiple",
  multiple_select: "Selección múltiple (varias correctas)",
  true_false: "Verdadero / Falso",
  fill_blank: "Completar espacios",
  short_answer: "Respuesta corta",
  matching: "Emparejar",
  ordering: "Ordenar palabras o frases",
  categorize: "Clasificar en categorías",
};

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const ITEM_SPECS: Record<ItemTypeKey, string> = {
  multiple_choice: `{ "type": "multiple_choice", "prompt": "She ___ to school every day.", "options": ["go", "goes", "going"], "answer": 1 }
   - "answer" is the 0-based index of the correct option. 2 to 6 options, exactly one correct.`,
  true_false: `{ "type": "true_false", "prompt": "The speaker lives in London.", "answer": true }
   - "answer" is true or false (JSON boolean, not a string).`,
  fill_blank: `{ "type": "fill_blank", "prompt": "I ___ to the market yesterday and ___ some apples.", "answer": ["went", "bought"] }
   - Every blank is written exactly as three underscores "___".
   - "answer" has ONE string per blank, in order. Accept alternatives with "|" (e.g. "isn't|is not").`,
  multiple_select: `{ "type": "multiple_select", "prompt": "Which of these are fruits?", "options": ["apple", "carrot", "banana", "potato"], "answer": [0, 2] }
   - "answer" lists the 0-based indexes of ALL the correct options (one or more). 3 to 8 options.`,
  short_answer: `{ "type": "short_answer", "prompt": "What is the past tense of 'go'?", "answer": ["went"] }
   - "answer" lists every accepted answer (a plain list of strings). Use it for questions answered with a word or a short phrase.`,
  ordering: `{ "type": "ordering", "prompt": "Put the words in order.", "parts": ["school", "to", "goes", "She"], "answer": [3, 2, 1, 0] }
   - "parts" must be in a SCRAMBLED order (never already in the correct order).
   - "answer[i]" is the index in "parts" of the piece that goes in position i. Use every piece exactly once. 2 to 12 pieces. Works for words in a sentence or sentences in a paragraph.`,
  categorize: `{ "type": "categorize", "prompt": "Sort the verbs.", "categories": ["Regular", "Irregular"], "items": ["walk", "go", "play", "eat"], "answer": [0, 1, 0, 1] }
   - "answer[i]" is the index in "categories" for items[i]. 2 to 6 categories, 2 to 12 items.`,
  matching: `{ "type": "matching", "prompt": "Match each word with its definition.", "left": ["happy", "angry"], "right": ["feeling joy", "feeling mad"], "answer": [0, 1] }
   - "answer[i]" is the index in "right" that matches left[i]. Same length for left, right and answer; 2 to 10 pairs.`,
};

const ALL_TYPES = Object.keys(ITEM_SPECS) as ItemTypeKey[];

const OUTPUT_RULES = `OUTPUT RULES (very important):
- Reply with ONE valid JSON object and NOTHING else: no explanations, no markdown, no code fences.
- Use double quotes. No trailing commas. No comments.`;

function itemSpecs(types: ItemTypeKey[]) {
  return types.map((t, i) => ` ${i + 1}. ${ITEM_SPECS[t]}`).join("\n");
}

/** Estructura JSON por tipo de ejercicio (sin audio_url ni transcript: los aporta el formulario). */
function schemaFor(kind: ExerciseKind, level: string, count: string): string {
  const lv = JSON.stringify(level);
  switch (kind) {
    case "writing":
      return `{
  "kind": "writing",
  "title": "short title",
  "level": ${lv},
  "instructions": "what the student must do",
  "prompt": "the writing topic or question",
  "min_words": 80
}
("min_words" is optional: include it only if the material mentions a minimum.)`;
    case "speaking":
      return `{
  "kind": "speaking",
  "title": "short title",
  "level": ${lv},
  "instructions": "what the student must do",
  "prompt": "the question or situation the student must talk about",
  "max_seconds": 90
}
("max_seconds" is optional: include it only if the material mentions a time limit.)`;
    case "listening":
      return `{
  "kind": "listening",
  "title": "short title",
  "level": ${lv},
  "instructions": "Listen and answer the questions.",
  "items": [ ${count} ]
}
Do NOT include any audio/video link or transcript: the teacher adds them separately.`;
    case "exercise":
      return `{
  "kind": "exercise",
  "title": "short title",
  "level": ${lv},
  "instructions": "what the student must do",
  "items": [ ${count} ]
}`;
  }
}

const hasItems = (kind: ExerciseKind) => kind === "exercise" || kind === "listening";

export function buildPrompt(o: PromptOptions): string {
  // Listening siempre parte del material del docente (audio, preguntas y respuestas ya existen).
  if (o.mode === "format" || o.kind === "listening") return buildFormatPrompt(o);
  return buildGeneratePrompt(o);
}

function buildFormatPrompt(o: PromptOptions): string {
  const materialHint = hasItems(o.kind)
    ? "the questions, the answer options and the correct answers"
    : "the task statement (and any instructions)";
  return `You are a formatting assistant for English teachers. Convert the teacher's material (written after "MATERIAL:" at the end) into the JSON format below.

STRICT RULES:
- Do NOT invent, change, translate, correct, reorder or remove anything: keep every question, option, sentence and answer exactly as written.
- The material contains ${materialHint}. Use only that.
- If something needed is missing or ambiguous (for example, the correct answer of a question is not indicated), do NOT guess: reply with a short question to the teacher instead of the JSON.
${hasItems(o.kind) ? `- Pick each question's "type" from how it is written: one correct option among several -> multiple_choice; several correct options -> multiple_select; true/false statement -> true_false; sentence with gaps -> fill_blank (write every gap as "___"); question answered with a word or short phrase -> short_answer; two columns to join -> matching; words or sentences to put in order -> ordering (scramble the parts); items to sort into groups -> categorize.\n` : ""}
${OUTPUT_RULES}

JSON format:
${schemaFor(o.kind, o.level, hasItems(o.kind) ? "...one object per question in the material..." : "")}
${hasItems(o.kind) ? `\nQuestion object formats (use only the ones the material needs):\n${itemSpecs(ALL_TYPES)}\n` : ""}
MATERIAL:
(paste here the teacher's ${hasItems(o.kind) ? "questions and answers" : "task"})`;
}

function buildGeneratePrompt(o: PromptOptions): string {
  const topic = o.topic.trim() || "(choose an appropriate everyday topic)";
  const head = `You are an experienced English teacher creating material for ${o.level} (CEFR) students of English as a foreign language.
Topic: ${topic}. All text must be in English, appropriate for the level.`;
  if (!hasItems(o.kind)) {
    return `${head}
Create ONE ${o.kind} task.

${OUTPUT_RULES}

JSON format:
${schemaFor(o.kind, o.level, "")}`;
  }
  const types = o.itemTypes.length ? o.itemTypes : (["multiple_choice"] as ItemTypeKey[]);
  return `${head}
Create ONE exercise with ${o.count} questions.
Use only these question types${types.length > 1 ? " (mix them)" : ""}: ${types.join(", ")}.

${OUTPUT_RULES}

JSON format:
${schemaFor(o.kind, o.level, `...${o.count} question objects...`)}

Question object formats:
${itemSpecs(types)}`;
}
