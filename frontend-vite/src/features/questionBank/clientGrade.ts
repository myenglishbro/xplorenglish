import type { ItemAnswer } from "@/features/activities/components/itemAnswers";
import type { ExerciseItem } from "@/server/questionBank/types";

const norm = (s: string) => s.trim().toLowerCase();
const sameList = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Corrección LOCAL solo para la vista previa del docente (el contenido del banco trae las
 * respuestas). Refleja las reglas de private.grade_activity (0048/0052), que es la autoridad real
 * cuando el estudiante envía: si cambia una regla allá, se cambia acá.
 */
export function gradeItemLocally(item: ExerciseItem, answer: ItemAnswer): boolean {
  if (answer === null || answer === undefined) return false;
  switch (item.type) {
    case "multiple_choice":
      return answer === item.answer;
    case "true_false":
      return answer === item.answer;
    case "fill_blank": {
      const a = answer as string[];
      return a.length === item.answer.length && item.answer.every((key, i) => key.split("|").some((alt) => norm(alt) === norm(a[i] ?? "")));
    }
    case "short_answer":
      return typeof answer === "string" && item.answer.some((key) => key.split("|").some((alt) => norm(alt) === norm(answer)));
    case "multiple_select": {
      const a = [...new Set(answer as number[])].sort((x, y) => x - y);
      const k = [...new Set(item.answer)].sort((x, y) => x - y);
      return sameList(a, k);
    }
    case "matching":
    case "ordering":
    case "categorize":
      return sameList(answer as unknown[], item.answer);
  }
}
