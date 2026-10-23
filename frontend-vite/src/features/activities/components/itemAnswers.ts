import type { PublicExerciseItem } from "@/server/questionBank/types";

/** Respuesta de un item según su tipo:
 *  multiple_choice -> índice; true_false -> boolean; fill_blank -> un string por hueco;
 *  matching / categorize -> por cada elemento, el índice elegido (o null);
 *  multiple_select -> índices marcados; ordering -> índices de las piezas en el orden elegido;
 *  short_answer -> texto. */
export type ItemAnswer = number | boolean | string | string[] | number[] | (number | null)[] | null;

export function emptyAnswer(item: PublicExerciseItem): ItemAnswer {
  switch (item.type) {
    case "fill_blank":
      return Array.from({ length: (item.prompt.match(/___/g) ?? []).length }, () => "");
    case "matching":
      return item.left.map(() => null);
    case "categorize":
      return item.items.map(() => null);
    case "multiple_select":
    case "ordering":
      return [];
    case "short_answer":
      return "";
    default:
      return null;
  }
}

export function isAnswered(item: PublicExerciseItem, value: ItemAnswer): boolean {
  if (value === null) return false;
  switch (item.type) {
    case "fill_blank":
      return (value as string[]).every((v) => v.trim().length > 0);
    case "matching":
    case "categorize":
      return (value as (number | null)[]).every((v) => v !== null);
    case "multiple_select":
      return (value as number[]).length > 0;
    case "ordering":
      return (value as number[]).length === item.parts.length;
    case "short_answer":
      return (value as string).trim().length > 0;
    default:
      return true;
  }
}
