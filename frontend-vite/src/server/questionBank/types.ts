import type { z } from "zod";
import type { exerciseContentSchema, itemSchema } from "./validation";

export type ExerciseKind = "writing" | "listening" | "speaking" | "exercise";
export type ExerciseContent = z.infer<typeof exerciseContentSchema>;
export type ExerciseItem = z.infer<typeof itemSchema>;

/** Item tal como lo ve el estudiante: sin `answer`. */
export type PublicExerciseItem =
  | { type: "multiple_choice"; prompt: string; options: string[] }
  | { type: "true_false"; prompt: string }
  | { type: "fill_blank"; prompt: string }
  | { type: "matching"; prompt?: string; left: string[]; right: string[] }
  | { type: "multiple_select"; prompt: string; options: string[] }
  | { type: "ordering"; prompt?: string; parts: string[] }
  | { type: "short_answer"; prompt: string }
  | { type: "categorize"; prompt?: string; categories: string[]; items: string[] };

export type PublicExerciseContent = {
  kind: ExerciseKind;
  title: string;
  instructions?: string;
  level?: string;
  topic?: string;
  prompt?: string;
  min_words?: number;
  max_seconds?: number;
  audio_url?: string;
  media_type?: "audio" | "video";
  items?: PublicExerciseItem[];
};

export interface ExerciseListItem {
  id: number;
  createdBy: string;
  kind: ExerciseKind;
  title: string;
  level: string | null;
  content: ExerciseContent;
  createdAt: string;
}

export interface ActivityItem {
  id: number;
  classroomId: number;
  kind: ExerciseKind;
  title: string;
  content: PublicExerciseContent;
  dueAt: string | null;
  createdAt: string;
}

export interface SubmissionItem {
  id: number;
  activityId: number;
  studentId: string;
  answers: unknown[] | null;
  textResponse: string | null;
  audioPath: string | null;
  score: number | null;
  maxScore: number | null;
  results: boolean[] | null;
  submittedAt: string;
  feedback: string | null;
  feedbackAt: string | null;
}

export const KIND_LABELS: Record<ExerciseKind, string> = {
  exercise: "Ejercicio",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};
