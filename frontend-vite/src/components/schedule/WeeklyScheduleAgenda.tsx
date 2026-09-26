import type React from "react";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { DAY_OF_WEEK_LABELS, WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import type { ScheduleBlockBase } from "./scheduleLayout";

export interface WeeklyScheduleAgendaProps<T extends ScheduleBlockBase> {
  blocks: T[];
  renderBlock: (block: T) => React.ReactNode;
  emptyTitle: string;
}

/**
 * Vista semanal genérica (FIX 7, segunda etapa) -- agrupada por día (lunes→domingo, mismo
 * WEEK_DISPLAY_ORDER que ya usa la grilla de disponibilidad) y ordenada por start_time dentro de
 * cada día. Deliberadamente vertical/apilada por día, nunca una grilla de 7 columnas, para que
 * funcione en móvil sin overflow horizontal. Puramente presentacional: no sabe de auth, RLS ni de
 * qué tabla vienen los bloques -- Teacher y Student le pasan su propio tipo vía `renderBlock`.
 */
export function WeeklyScheduleAgenda<T extends ScheduleBlockBase>({ blocks, renderBlock, emptyTitle }: WeeklyScheduleAgendaProps<T>) {
  if (blocks.length === 0) {
    return <EmptyState icon="calendar-blank" title={emptyTitle} />;
  }

  const byDay = new Map<number, T[]>();
  for (const block of blocks) {
    const list = byDay.get(block.dayOfWeek) ?? [];
    list.push(block);
    byDay.set(block.dayOfWeek, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const days = WEEK_DISPLAY_ORDER.filter((dayOfWeek) => (byDay.get(dayOfWeek)?.length ?? 0) > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {days.map((dayOfWeek) => (
        <div key={dayOfWeek}>
          <h3 style={{ margin: "0 0 8px", font: "var(--weight-bold) var(--text-body-size)/1.3 var(--font-display)", color: "var(--text-heading)" }}>
            {DAY_OF_WEEK_LABELS[dayOfWeek]}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byDay.get(dayOfWeek)!.map((block) => (
              <div
                key={block.id}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderLeft: "3px solid var(--xp-cyan)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  background: "var(--surface-card)",
                }}
              >
                {renderBlock(block)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
