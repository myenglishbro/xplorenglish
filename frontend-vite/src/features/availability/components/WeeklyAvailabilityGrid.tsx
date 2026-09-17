import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { DAY_OF_WEEK_LABELS, WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import type { AvailabilityBlockDraft, AvailabilityBlockItem } from "@/features/availability/types";

const SLOT_MINUTES = 30;
const START_MINUTES = 6 * 60; // 06:00
const END_MINUTES = 23 * 60; // 23:00 (límite exclusivo del último bloque)

const SLOT_STARTS: number[] = [];
for (let m = START_MINUTES; m < END_MINUTES; m += SLOT_MINUTES) SLOT_STARTS.push(m);

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
function minutesToLabel(m: number): string {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function cellKey(day: number, minute: number): string {
  return `${day}-${minute}`;
}

/** Expande cada bloque guardado en celdas de 30 min para inicializar la grilla. Ignora minutos
 * fuera de la grilla soportada (06:00-23:00, pasos de 30 min) -- datos heredados de un modelo
 * anterior sin esa restricción no deben reintroducirse como bloques inválidos al guardar (ver
 * cellsToBlocks: un minuto no alineado podía generar horas como "24:28", rechazadas por Postgres). */
function blocksToCells(blocks: AvailabilityBlockItem[]): Set<string> {
  const set = new Set<string>();
  for (const b of blocks) {
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    for (let m = sh * 60 + sm; m < eh * 60 + em; m += SLOT_MINUTES) {
      if (m < START_MINUTES || m >= END_MINUTES || m % SLOT_MINUTES !== 0) continue;
      set.add(cellKey(b.dayOfWeek, m));
    }
  }
  return set;
}

/** Consolida celdas de 30 min contiguas del mismo día en bloques start/end antes de guardar --
 * nunca se manda una fila por celda al backend. */
function cellsToBlocks(cells: Set<string>): AvailabilityBlockDraft[] {
  const byDay = new Map<number, number[]>();
  for (const key of cells) {
    const [dayStr, minuteStr] = key.split("-");
    const day = Number(dayStr);
    const list = byDay.get(day) ?? [];
    list.push(Number(minuteStr));
    byDay.set(day, list);
  }

  const blocks: AvailabilityBlockDraft[] = [];
  for (const [day, minutes] of byDay) {
    const sorted = [...minutes].sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const m = sorted[i];
      if (m === prev + SLOT_MINUTES) {
        prev = m;
        continue;
      }
      blocks.push({ dayOfWeek: day, startTime: minutesToLabel(start), endTime: minutesToLabel(prev + SLOT_MINUTES) });
      start = m;
      prev = m;
    }
    blocks.push({ dayOfWeek: day, startTime: minutesToLabel(start), endTime: minutesToLabel(prev + SLOT_MINUTES) });
  }
  return blocks;
}

export interface WeeklyAvailabilityGridProps {
  value: AvailabilityBlockItem[];
  onSave: (blocks: AvailabilityBlockDraft[]) => Promise<unknown>;
  isSaving: boolean;
  saveError?: string | null;
  justSaved?: boolean;
}

/**
 * Grilla semanal 06:00-23:00 en pasos de 30 min (Slice D). Interacción: clic para marcar/desmarcar
 * una celda, o mousedown + arrastrar para aplicar el mismo estado a varias celdas seguidas -- sin
 * librería externa. El profesor arrastra sobre celdas de 30 min; al guardar se consolidan en
 * bloques start/end contiguos (cellsToBlocks) antes de llamar a set_my_teacher_availability.
 */
export function WeeklyAvailabilityGrid({ value, onSave, isSaving, saveError, justSaved }: WeeklyAvailabilityGridProps) {
  const [cells, setCells] = React.useState<Set<string>>(() => blocksToCells(value));
  const [dirty, setDirty] = React.useState(false);
  const dragRef = React.useRef<{ dragging: boolean; target: boolean }>({ dragging: false, target: true });

  React.useEffect(() => {
    if (!dirty) setCells(blocksToCells(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    function endDrag() {
      dragRef.current.dragging = false;
    }
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

  function applyCell(key: string, on: boolean) {
    setDirty(true);
    setCells((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleMouseDown(key: string) {
    const target = !cells.has(key);
    dragRef.current = { dragging: true, target };
    applyCell(key, target);
  }

  function handleMouseEnter(key: string) {
    if (!dragRef.current.dragging) return;
    applyCell(key, dragRef.current.target);
  }

  async function handleSave() {
    try {
      await onSave(cellsToBlocks(cells));
      setDirty(false);
    } catch (err) {
      console.error("[WeeklyAvailabilityGrid] error al guardar disponibilidad:", err);
    }
  }

  return (
    <Card
      header={
        <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Mi disponibilidad
        </h2>
      }
    >
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-muted)" }}>
        Marca los bloques en los que normalmente puedes dictar clases. Es solo referencial -- no bloquea registrar una clase fuera de estos horarios.
        Haz clic para marcar/desmarcar, o clic y arrastra para seleccionar varias celdas seguidas.
      </p>

      <div style={{ overflowX: "auto" }} onMouseLeave={() => (dragRef.current.dragging = false)}>
        <table style={{ borderCollapse: "collapse", minWidth: 580, userSelect: "none" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "var(--surface-card)" }} />
              {WEEK_DISPLAY_ORDER.map((day) => (
                <th
                  key={day}
                  style={{ padding: "4px 6px", font: "var(--weight-bold) 12px/1 var(--font-body)", color: "var(--text-heading)", textAlign: "center" }}
                >
                  {DAY_OF_WEEK_LABELS[day].slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_STARTS.map((minute) => (
              <tr key={minute}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--surface-card)",
                    padding: "0 8px 0 0",
                    font: "var(--weight-medium) 11px/1 var(--font-body)",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {minute % 60 === 0 ? minutesToLabel(minute) : ""}
                </td>
                {WEEK_DISPLAY_ORDER.map((day) => {
                  const key = cellKey(day, minute);
                  const on = cells.has(key);
                  return (
                    <td key={key} style={{ padding: 1 }}>
                      <div
                        role="button"
                        aria-pressed={on}
                        onMouseDown={() => handleMouseDown(key)}
                        onMouseEnter={() => handleMouseEnter(key)}
                        style={{
                          width: 28,
                          height: 18,
                          borderRadius: 3,
                          cursor: "pointer",
                          background: on ? "var(--xp-cyan)" : "var(--surface-sunken)",
                          border: `1px solid ${on ? "var(--xp-cyan)" : "var(--border-subtle)"}`,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {saveError && <Alert tone="danger">{saveError}</Alert>}
        {justSaved && !dirty && <Alert tone="success">Disponibilidad guardada.</Alert>}
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!dirty && !isSaving} style={{ alignSelf: "flex-start" }}>
          Guardar disponibilidad
        </Button>
      </div>
    </Card>
  );
}
