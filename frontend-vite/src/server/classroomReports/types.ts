export type SkillKey = "speaking" | "writing" | "listening" | "reading";

export interface ReportItem {
  id: number;
  classroomId: number;
  title: string;
  summary: string | null;
  skills: Record<SkillKey, string | null>;
  comments: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SKILLS: { key: SkillKey; label: string; icon: string; hint: string }[] = [
  { key: "speaking", label: "Speaking", icon: "microphone", hint: "Pronunciación, fluidez, vocabulario al hablar…" },
  { key: "writing", label: "Writing", icon: "pencil-line", hint: "Gramática, estructura, ortografía, vocabulario…" },
  { key: "listening", label: "Listening", icon: "headphones", hint: "Comprensión de audios, detalles, velocidad…" },
  { key: "reading", label: "Reading", icon: "book-open", hint: "Comprensión lectora, vocabulario, inferencias…" },
];
