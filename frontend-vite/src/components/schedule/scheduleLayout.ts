/** Lógica PURA de posicionamiento temporal para la vista de calendario semanal (FIX 7, segunda
 * etapa) -- inspirada conceptualmente en el algoritmo de "clusters + carriles" de WeeklyAgenda.tsx
 * (Admin > Dashboard), pero reescrita de forma independiente y genérica: sin navegación, sin
 * ventana fija 06:00-23:00 y sin ningún acoplamiento a acciones administrativas. */

export interface ScheduleBlockBase {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function minutesOfTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h as number) * 60 + (m as number);
}

/** Rango visual [startMinutes, endMinutes], ambos múltiplos de 60 -- primera hora con clase
 * redondeada hacia abajo, última hora redondeada hacia arriba, sin obligar a mostrar 06:00-23:00
 * completo. Fallback razonable (08:00-20:00) si no hay bloques todavía. */
export function computeVisibleRange(blocks: ScheduleBlockBase[]): { startMinutes: number; endMinutes: number } {
  if (blocks.length === 0) return { startMinutes: 8 * 60, endMinutes: 20 * 60 };

  let earliest = Infinity;
  let latest = -Infinity;
  for (const block of blocks) {
    earliest = Math.min(earliest, minutesOfTime(block.startTime));
    latest = Math.max(latest, minutesOfTime(block.endTime));
  }

  const startMinutes = Math.max(0, Math.floor(earliest / 60) * 60);
  const endMinutesRaw = Math.min(24 * 60, Math.ceil(latest / 60) * 60);
  const endMinutes = Math.max(endMinutesRaw, startMinutes + 60); // al menos 1h de alto, evita un rango degenerado
  return { startMinutes, endMinutes };
}

export interface LaidOutBlock<T> {
  block: T;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

/**
 * Asigna carril (lane) a los bloques de UN día para que los horarios solapados nunca se tapen entre
 * sí (se dividen horizontalmente) -- agrupa por "clusters" de solapamiento consecutivo. `minHeightPx`
 * evita que una clase muy corta (ej. 30 min) quede ilegible.
 */
export function layoutDayBlocks<T extends ScheduleBlockBase>(
  blocks: T[],
  rangeStartMinutes: number,
  pxPerMinute: number,
  minHeightPx = 24,
): LaidOutBlock<T>[] {
  const items = blocks
    .map((block) => ({ block, start: minutesOfTime(block.startTime), end: minutesOfTime(block.endTime) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: LaidOutBlock<T>[] = [];
  let clusterStart = 0;

  while (clusterStart < items.length) {
    let clusterEnd = items[clusterStart]!.end;
    let i = clusterStart + 1;
    while (i < items.length && items[i]!.start < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, items[i]!.end);
      i++;
    }
    const cluster = items.slice(clusterStart, i);

    const laneEnds: number[] = [];
    const laneOfIndex: number[] = [];
    cluster.forEach((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      laneOfIndex.push(lane);
    });
    const laneCount = laneEnds.length;

    cluster.forEach((item, idx) => {
      result.push({
        block: item.block,
        top: (item.start - rangeStartMinutes) * pxPerMinute,
        height: Math.max((item.end - item.start) * pxPerMinute, minHeightPx),
        lane: laneOfIndex[idx]!,
        laneCount,
      });
    });

    clusterStart = i;
  }

  return result;
}
