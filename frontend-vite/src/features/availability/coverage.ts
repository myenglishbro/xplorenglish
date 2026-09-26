import type { AvailabilityBlockItem } from "./types";

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Acepta rangos contiguos, pero nunca considera suficiente un solape parcial. */
export function coversInterval(
  blocks: AvailabilityBlockItem[],
  dayOfWeek: number,
  start: number,
  end: number
): boolean {
  const intervals = blocks
    .filter((block) => block.dayOfWeek === dayOfWeek)
    .map((block) => ({ start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) }))
    .sort((a, b) => a.start - b.start);

  let coveredUntil = start;
  for (const interval of intervals) {
    if (interval.start > coveredUntil) break;
    if (interval.end > coveredUntil) coveredUntil = interval.end;
    if (coveredUntil >= end) return true;
  }
  return false;
}

interface TimeBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** Intersección de intervalos (no cobertura total): cualquier solape, por parcial que sea,
 * cuenta -- a diferencia de coversInterval, que exige cubrir el bloque completo. */
export function findOverlapping<T extends TimeBlock>(blocks: T[], dayOfWeek: number, start: number, end: number): T[] {
  return blocks.filter((block) => {
    if (block.dayOfWeek !== dayOfWeek) return false;
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    return blockStart < end && blockEnd > start;
  });
}
