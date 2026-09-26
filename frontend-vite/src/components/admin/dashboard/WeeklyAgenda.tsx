import React from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ui/core/IconButton";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { getWeekRangeInLima, getTodayRangeInLima } from "@/lib/datetime/lima";
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

type EventContentTier = "wide" | "medium" | "narrow";

/**
 * Nivel de detalle del contenido de un evento -- deriva PURAMENTE de `laneCount`, ya calculado por
 * layoutDayBlocks (nunca se mide el ancho real del DOM/ResizeObserver/container queries): todos los
 * carriles de un mismo cluster de solapamiento dividen el ancho de columna en partes iguales, así
 * que laneCount es un proxy fiable y ya disponible sin costo adicional. laneCount 2 y 3 comparten
 * el mismo contenido ("medium": nombre + nivel/hora de inicio) -- a 3 carriles el nombre ya se
 * trunca más agresivo vía la misma elipsis CSS existente, sin lógica de truncado nueva.
 */
function contentTierOf(laneCount: number): EventContentTier {
  if (laneCount === 1) return "wide";
  if (laneCount <= 3) return "medium";
  return "narrow";
}

/** Alto del viewport interno del calendario (~680px pedido) -- SOLO acota qué tanto se ve sin
 * scrollear, nunca el contenido real: GRID_HEIGHT (06:00-23:00, 816px) no cambia, solo queda
 * parcialmente visible dentro de este viewport con scroll vertical interno. */
const VIEWPORT_MAX_HEIGHT = 680;

export function WeeklyAgenda({ blocks }: { blocks: WeeklyAgendaBlock[] }) {
  const navigate = useNavigate();
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Posición inicial de scroll (sin timers, sin re-disparar en cada semana): al montar, deja
  // ~07:00 cerca del borde superior del viewport en vez de forzar 06:00 pegado arriba. Un solo
  // ajuste síncrono de scrollTop -- nunca auto-scroll continuo, nunca cambia datos/posiciones.
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_PX;
  }, []);

  const weekRange = getWeekRangeInLima(anchorDate);
  const todayStart = getTodayRangeInLima().start.getTime();
  const weekDays = WEEK_DISPLAY_ORDER.map((dayOfWeek, i) => {
    const date = new Date(weekRange.start.getTime() + i * DAY_MS);
    return { dayOfWeek, date, isToday: date.getTime() === todayStart };
  });

  const blocksByDay = new Map<number, WeeklyAgendaBlock[]>();
  for (const block of blocks) {
    const list = blocksByDay.get(block.dayOfWeek) ?? [];
    list.push(block);
    blocksByDay.set(block.dayOfWeek, list);
  }

  const rangeLabel = `${formatDayMonth(weekDays[0]!.date)} – ${formatDayMonth(weekDays[6]!.date)} ${formatYear(weekDays[6]!.date)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Puramente presentacional -- hover/focus de los eventos vía pseudo-clases (sin estado local
          nuevo) y variante compacta para bloques muy cortos. El box-shadow de :focus-visible NUNCA
          se toca acá: lo sigue gobernando la regla global de base.css (:focus-visible{box-shadow:
          var(--focus-ring)}), así el foco de teclado se mantiene exactamente igual que en el resto
          de la app. */}
      {/* padding/gap del evento viven ÚNICAMENTE acá (nunca en el style inline del botón): un
          inline style siempre gana sobre una regla de hoja de estilos sin importar su selector, así
          que estas variantes por clase (--compact/--narrow) solo pueden funcionar si el inline no
          declara esas mismas propiedades. */}
      <style>{`
        .xp-weekly-agenda-event { transition: var(--transition-control); padding: 3px 6px; gap: 1px; }
        .xp-weekly-agenda-event:hover,
        .xp-weekly-agenda-event:focus-visible { background: var(--cyan-100); }
        .xp-weekly-agenda-event:hover { box-shadow: var(--shadow-xs); }
        .xp-weekly-agenda-event--compact { padding: 2px 6px; gap: 0; }
        .xp-weekly-agenda-event--narrow { padding: 1px 2px; text-align: center; gap: 0; }
        .xp-weekly-agenda-event--medium { padding: 3px 4px; }
        .xp-weekly-agenda-event--medium.xp-weekly-agenda-event--compact { padding: 2px 4px; }
      `}</style>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Agenda semanal
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate(new Date())}>
            Hoy
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "2px 4px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <IconButton
              icon="caret-left"
              size="sm"
              label="Semana anterior"
              onClick={() => setAnchorDate((prev) => new Date(prev.getTime() - 7 * DAY_MS))}
            />
            <span
              style={{
                padding: "0 4px",
                font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)",
                color: "var(--text-body)",
                whiteSpace: "nowrap",
              }}
            >
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
      </div>

      {blocks.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin horarios configurados">
          Cuando un salón tenga un horario semanal, aparecerá acá.
        </EmptyState>
      ) : (
        // Viewport interno con scroll propio (~680px) -- GRID_HEIGHT/HOURS/layoutDayBlocks NO
        // cambian: 06:00-23:00 sigue completo, solo queda parcialmente visible sin scrollear. Un
        // solo contenedor maneja ambos ejes (overflowX para 7 días + overflowY para las horas), así
        // que el header sticky (position:sticky/top:0) queda relativo a ESTE mismo contenedor y se
        // mantiene alineado con las columnas mientras se scrollea horizontalmente también.
        <div
          ref={scrollRef}
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: VIEWPORT_MAX_HEIGHT,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, minmax(150px, 1fr))", minWidth: 1100 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface-card)" }} />
            {weekDays.map(({ dayOfWeek, date, isToday }) => (
              <div
                key={dayOfWeek}
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  textAlign: "center",
                  padding: "8px 4px 9px",
                  background: "var(--surface-card)",
                  borderBottom: isToday ? "2px solid var(--xp-cyan)" : "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    font: "var(--weight-semibold) 10px/1 var(--font-body)",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                    color: isToday ? "var(--cyan-700)" : "var(--text-muted)",
                  }}
                >
                  {dayShortLabel(dayOfWeek)}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    font: "var(--weight-bold) 16px/1 var(--font-display)",
                    color: isToday ? "var(--cyan-700)" : "var(--text-heading)",
                  }}
                >
                  {formatDayNumber(date)}
                </div>
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
                    color: "var(--text-subtle)",
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
                    borderLeft: "1px solid rgba(16,24,40,.08)",
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
                        borderBottom: "1px solid rgba(16,24,40,.05)",
                      }}
                    />
                  ))}

                  {dayBlocks.map(({ block, top, height, lane, laneCount }) => {
                    const tier = contentTierOf(laneCount);
                    const isCompact = height <= 26;
                    const isNarrow = tier === "narrow";
                    const isMedium = tier === "medium";
                    const primary = block.studentName ?? block.classroomName;
                    const timeRange = `${block.startTime.slice(0, 5)}–${block.endTime.slice(0, 5)}`;
                    const startTime = block.startTime.slice(0, 5);
                    const secondary = [block.level, timeRange].filter(Boolean).join(" · ");
                    const teacher = teacherLabel(block.teacherNames);

                    const className = [
                      "xp-weekly-agenda-event",
                      isCompact && "xp-weekly-agenda-event--compact",
                      isNarrow && "xp-weekly-agenda-event--narrow",
                      isMedium && "xp-weekly-agenda-event--medium",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={block.id}
                        type="button"
                        className={className}
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
                          borderLeft: "2px solid var(--xp-cyan)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--cyan-50)",
                          overflow: "hidden",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {tier === "narrow" ? (
                          <>
                            <span style={{ font: "var(--weight-bold) 9px/1.15 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden" }}>
                              {block.level ?? "—"}
                            </span>
                            <span style={{ font: "var(--weight-semibold) 8px/1.15 var(--font-body)", color: "var(--cyan-700)", whiteSpace: "nowrap", overflow: "hidden" }}>
                              {startTime}
                            </span>
                          </>
                        ) : tier === "medium" ? (
                          <>
                            <span style={{ font: "var(--weight-bold) 10.5px/1.2 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {primary}
                            </span>
                            <span style={{ font: "var(--weight-medium) 10px/1.2 var(--font-body)", color: "var(--cyan-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {[block.level, startTime].filter(Boolean).join(" · ")}
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ font: "var(--weight-bold) 11px/1.2 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {primary}
                            </span>
                            <span style={{ font: "var(--weight-medium) 10px/1.2 var(--font-body)", color: "var(--cyan-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {secondary}
                            </span>
                            <span style={{ font: "var(--weight-regular) 10px/1.2 var(--font-body)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {teacher}
                            </span>
                          </>
                        )}
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
