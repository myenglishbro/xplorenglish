import type React from "react";
import { DAY_OF_WEEK_LABELS, WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import { computeVisibleRange, layoutDayBlocks, type ScheduleBlockBase } from "./scheduleLayout";

const HOUR_PX = 56;
const PX_PER_MINUTE = HOUR_PX / 60;

export interface WeeklyScheduleCalendarProps<T extends ScheduleBlockBase> {
  blocks: T[];
  renderBlock: (block: T) => React.ReactNode;
}

/**
 * Calendario semanal real (FIX 7, segunda etapa -- corrección visual) -- grilla lunes→domingo con
 * eje de horas, posición vertical según start_time y alto según duración. Vista principal DESKTOP;
 * WeeklySchedule.tsx la combina con WeeklyScheduleAgenda (mobile) vía CSS, nunca ambas a la vez.
 * Rango horario dinámico (computeVisibleRange): nunca fuerza 06:00-23:00 si los horarios reales caen
 * en una ventana más chica. Scroll horizontal, si hace falta, queda contenido DENTRO de este
 * componente (nunca en la página completa).
 */
export function WeeklyScheduleCalendar<T extends ScheduleBlockBase>({ blocks, renderBlock }: WeeklyScheduleCalendarProps<T>) {
  const { startMinutes, endMinutes } = computeVisibleRange(blocks);
  const gridHeight = (endMinutes - startMinutes) * PX_PER_MINUTE;
  const hours: number[] = [];
  for (let m = startMinutes; m <= endMinutes; m += 60) hours.push(m / 60);

  const blocksByDay = new Map<number, T[]>();
  for (const block of blocks) {
    const list = blocksByDay.get(block.dayOfWeek) ?? [];
    list.push(block);
    blocksByDay.set(block.dayOfWeek, list);
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, minmax(112px, 1fr))", minWidth: 620 }}>
        <div />
        {WEEK_DISPLAY_ORDER.map((dayOfWeek) => (
          <div
            key={dayOfWeek}
            style={{
              textAlign: "center",
              padding: "0 0 8px",
              font: "var(--weight-bold) 12px/1 var(--font-body)",
              color: "var(--text-heading)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {DAY_OF_WEEK_LABELS[dayOfWeek]!.slice(0, 3)}
          </div>
        ))}

        <div style={{ position: "relative", height: gridHeight }}>
          {hours.map((hour) => (
            <div
              key={hour}
              style={{
                position: "absolute",
                top: (hour * 60 - startMinutes) * PX_PER_MINUTE - 6,
                right: 8,
                font: "var(--weight-medium) 10px/1 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
          const laidOut = layoutDayBlocks(blocksByDay.get(dayOfWeek) ?? [], startMinutes, PX_PER_MINUTE);
          return (
            <div key={dayOfWeek} style={{ position: "relative", height: gridHeight, borderLeft: "1px solid var(--border-subtle)" }}>
              {hours.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  style={{
                    position: "absolute",
                    top: (hour * 60 - startMinutes) * PX_PER_MINUTE,
                    left: 0,
                    right: 0,
                    height: HOUR_PX,
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                />
              ))}

              {laidOut.map(({ block, top, height, lane, laneCount }) => (
                <div
                  key={block.id}
                  style={{
                    position: "absolute",
                    top,
                    height,
                    left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                    width: `calc(${100 / laneCount}% - 4px)`,
                    padding: "3px 6px",
                    border: "1px solid var(--cyan-200)",
                    borderLeft: "3px solid var(--xp-cyan)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--cyan-50)",
                    overflow: "hidden",
                  }}
                >
                  {renderBlock(block)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
