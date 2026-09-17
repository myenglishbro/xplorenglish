import React from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ui/core/IconButton";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { getWeekRangeInLima } from "@/lib/datetime/lima";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";
import { WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import type { WeeklyAgendaBlock } from "@/server/dashboard/types";

const DAY_MS = 24 * 60 * 60_000;
const START_MINUTES = 6 * 60; // 06:00 -- misma ventana visible que la grilla de disponibilidad
const END_MINUTES = 23 * 60; // 23:00
const HOUR_PX = 48;
const PX_PER_MINUTE = HOUR_PX / 60;
const GRID_HEIGHT = ((END_MINUTES - START_MINUTES) / 60) * HOUR_PX;
const HOURS = Array.from({ length: (END_MINUTES - START_MINUTES) / 60 + 1 }, (_, i) => START_MINUTES / 60 + i);

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h as number) * 60 + (m as number);
}

function dayShortLabel(dayOfWeek: number): string {
  return DAY_OF_WEEK_LABELS[dayOfWeek]!.slice(0, 3);
}

function formatDayNumber(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "numeric" }).format(date);
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short" }).format(date);
}

function formatYear(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", year: "numeric" }).format(date);
}

interface LayoutBlock {
  block: WeeklyAgendaBlock;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

/**
 * Asigna carril (lane) a cada bloque de un día para que los horarios solapados nunca desaparezcan
 * (se dividen horizontalmente) -- algoritmo simple de "clusters" de solapamiento, suficiente para el
 * volumen de esta agenda (no es un calendario empresarial). Bloques fuera de 06:00-23:00 (datos de
 * prueba/legacy, ej. 23:58-23:59) se recortan a esa ventana visible; si quedan con duración <= 0 tras
 * el recorte, se omiten de la vista SIN romper el resto de la agenda.
 */
function layoutDayBlocks(blocks: WeeklyAgendaBlock[]): LayoutBlock[] {
  const clamped = blocks
    .map((block) => {
      const start = Math.max(minutesOf(block.startTime), START_MINUTES);
      const end = Math.min(minutesOf(block.endTime), END_MINUTES);
      return { block, start, end };
    })
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: LayoutBlock[] = [];
  let clusterStart = 0;

  while (clusterStart < clamped.length) {
    let clusterEnd = clamped[clusterStart]!.end;
    let i = clusterStart + 1;
    while (i < clamped.length && clamped[i]!.start < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, clamped[i]!.end);
      i++;
    }
    const cluster = clamped.slice(clusterStart, i);

    const laneEnds: number[] = [];
    const laneOf = new Map<number, number>();
    cluster.forEach((item, idx) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      laneOf.set(idx, lane);
    });
    const laneCount = laneEnds.length;

    cluster.forEach((item, idx) => {
      result.push({
        block: item.block,
        top: (item.start - START_MINUTES) * PX_PER_MINUTE,
        height: (item.end - item.start) * PX_PER_MINUTE,
        lane: laneOf.get(idx)!,
        laneCount,
      });
    });

    clusterStart = i;
  }

  return result;
}

function teacherLabel(names: string[]): string {
  if (names.length === 0) return "Sin profesor";
  if (names.length === 1) return names[0]!;
  return `${names.length} profesores`;
}

export function WeeklyAgenda({ blocks }: { blocks: WeeklyAgendaBlock[] }) {
  const navigate = useNavigate();
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());

  const weekRange = getWeekRangeInLima(anchorDate);
  const weekDays = WEEK_DISPLAY_ORDER.map((dayOfWeek, i) => {
    const date = new Date(weekRange.start.getTime() + i * DAY_MS);
    return { dayOfWeek, date };
  });

  const blocksByDay = new Map<number, WeeklyAgendaBlock[]>();
  for (const block of blocks) {
    const list = blocksByDay.get(block.dayOfWeek) ?? [];
    list.push(block);
    blocksByDay.set(block.dayOfWeek, list);
  }

  const rangeLabel = `${formatDayMonth(weekDays[0]!.date)} – ${formatDayMonth(weekDays[6]!.date)} ${formatYear(weekDays[6]!.date)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Agenda semanal
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate(new Date())}>
            Hoy
          </Button>
          <IconButton
            icon="caret-left"
            size="sm"
            label="Semana anterior"
            onClick={() => setAnchorDate((prev) => new Date(prev.getTime() - 7 * DAY_MS))}
          />
          <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)", color: "var(--text-body)", whiteSpace: "nowrap" }}>
            {rangeLabel}
          </span>
          <IconButton
            icon="caret-right"
            size="sm"
            label="Semana siguiente"
            onClick={() => setAnchorDate((prev) => new Date(prev.getTime() + 7 * DAY_MS))}
          />
        </div>
      </div>

      {blocks.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin horarios configurados">
          Cuando un salón tenga un horario semanal, aparecerá acá.
        </EmptyState>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, minmax(128px, 1fr))", minWidth: 900 }}>
            <div />
            {weekDays.map(({ dayOfWeek, date }) => (
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
                {dayShortLabel(dayOfWeek)} {formatDayNumber(date)}
              </div>
            ))}

            <div style={{ position: "relative", height: GRID_HEIGHT }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{
                    position: "absolute",
                    top: (hour * 60 - START_MINUTES) * PX_PER_MINUTE - 6,
                    right: 8,
                    font: "var(--weight-medium) 10px/1 var(--font-body)",
                    color: "var(--text-muted)",
                  }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {weekDays.map(({ dayOfWeek }) => {
              const dayBlocks = layoutDayBlocks(blocksByDay.get(dayOfWeek) ?? []);
              return (
                <div
                  key={dayOfWeek}
                  style={{
                    position: "relative",
                    height: GRID_HEIGHT,
                    borderLeft: "1px solid var(--border-subtle)",
                  }}
                >
                  {HOURS.slice(0, -1).map((hour) => (
                    <div
                      key={hour}
                      style={{
                        position: "absolute",
                        top: (hour * 60 - START_MINUTES) * PX_PER_MINUTE,
                        left: 0,
                        right: 0,
                        height: HOUR_PX,
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    />
                  ))}

                  {dayBlocks.map(({ block, top, height, lane, laneCount }) => {
                    const primary = block.studentName ?? block.classroomName;
                    const secondary = [block.level, `${block.startTime.slice(0, 5)}–${block.endTime.slice(0, 5)}`].filter(Boolean).join(" · ");
                    const teacher = teacherLabel(block.teacherNames);
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => navigate(`/admin/salones/${block.classroomId}`)}
                        title={`${primary} · ${block.classroomName} · ${secondary} · ${teacher}`}
                        style={{
                          position: "absolute",
                          top,
                          height: Math.max(height, 22),
                          left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                          width: `calc(${100 / laneCount}% - 4px)`,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-start",
                          gap: 1,
                          padding: "3px 6px",
                          border: "1px solid var(--cyan-200)",
                          borderLeft: "3px solid var(--xp-cyan)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--cyan-50)",
                          overflow: "hidden",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ font: "var(--weight-bold) 11px/1.2 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {primary}
                        </span>
                        <span style={{ font: "var(--weight-medium) 10px/1.2 var(--font-body)", color: "var(--cyan-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {secondary}
                        </span>
                        <span style={{ font: "var(--weight-regular) 10px/1.2 var(--font-body)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {teacher}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
