import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { DAY_OF_WEEK_LABELS, WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import { coversInterval, timeToMinutes } from "@/features/availability/coverage";
import type { AvailabilityBlockDraft, AvailabilityBlockItem } from "@/features/availability/types";

const SLOT_MINUTES = 60;
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

/** Una hora se marca solo cuando la unión de rangos existentes la cubre completa. */
function blocksToCells(blocks: AvailabilityBlockItem[]): Set<string> {
  const set = new Set<string>();
  for (const day of WEEK_DISPLAY_ORDER) {
    for (const minute of SLOT_STARTS) {
      if (coversInterval(blocks, day, minute, minute + SLOT_MINUTES)) set.add(cellKey(day, minute));
    }
  }
  return set;
}

/** Aplica solo las horas editadas y conserva los tramos legacy de 30 minutos no tocados.
 * El RPC reemplaza toda la semana, por lo que enviar solo celdas visibles perdería esos tramos. */
function blocksWithEdits(value: AvailabilityBlockItem[], cells: Set<string>, editedCells: Set<string>): AvailabilityBlockDraft[] {
  const blocks: AvailabilityBlockDraft[] = [];
  for (const day of WEEK_DISPLAY_ORDER) {
    let ranges = value
      .filter((block) => block.dayOfWeek === day)
      .map((block) => ({ start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) }));

    for (const minute of SLOT_STARTS) {
      const key = cellKey(day, minute);
      if (!editedCells.has(key)) continue;
      const end = minute + SLOT_MINUTES;
      ranges = ranges.flatMap((range) => {
        if (range.end <= minute || range.start >= end) return [range];
        const parts: { start: number; end: number }[] = [];
        if (range.start < minute) parts.push({ start: range.start, end: minute });
        if (range.end > end) parts.push({ start: end, end: range.end });
        return parts;
      });
      if (cells.has(key)) ranges.push({ start: minute, end });
    }

    ranges.sort((a, b) => a.start - b.start);
    const merged: typeof ranges = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
      else merged.push({ ...range });
    }
    for (const range of merged) {
      blocks.push({ dayOfWeek: day, startTime: minutesToLabel(range.start), endTime: minutesToLabel(range.end) });
    }
  }
  return blocks;
}

export interface WeeklyAvailabilityGridProps {
  value: AvailabilityBlockItem[];
  onSave: (blocks: AvailabilityBlockDraft[]) => Promise<unknown>;
  isSaving: boolean;
  saveError?: string | null;
  justSaved?: boolean;
  /** Vista de solo lectura (Admin > Docentes > Ver disponibilidad): oculta el botón de guardar
   * y desactiva la edición por clic/arrastre, sin duplicar la grilla. */
  readOnly?: boolean;
}

/**
 * Grilla semanal 06:00-23:00 en pasos de 1 hora. Interacción: clic para marcar/desmarcar
 * una celda, o mousedown + arrastrar para aplicar el mismo estado a varias celdas seguidas -- sin
 * librería externa. Al guardar se consolidan los rangos antes de llamar a set_my_teacher_availability.
 */
export function WeeklyAvailabilityGrid({ value, onSave, isSaving, saveError, justSaved, readOnly }: WeeklyAvailabilityGridProps) {
  const [cells, setCells] = React.useState<Set<string>>(() => blocksToCells(value));
  const [dirty, setDirty] = React.useState(false);
  const editedCellsRef = React.useRef<Set<string>>(new Set());
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
    editedCellsRef.current.add(key);
    setDirty(true);
    setCells((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleMouseDown(key: string) {
    if (readOnly) return;
    const target = !cells.has(key);
    dragRef.current = { dragging: true, target };
    applyCell(key, target);
  }

  function handleMouseEnter(key: string) {
    if (readOnly || !dragRef.current.dragging) return;
    applyCell(key, dragRef.current.target);
  }

  async function handleSave() {
    try {
      await onSave(blocksWithEdits(value, cells, editedCellsRef.current));
      editedCellsRef.current.clear();
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
        {readOnly
          ? "Disponibilidad registrada por el docente en bloques de 1 hora. Es solo referencial -- no bloquea registrar una clase fuera de estos horarios."
          : "Marca las horas completas en las que normalmente puedes dictar clases. Es solo referencial -- no bloquea registrar una clase fuera de estos horarios. Haz clic para marcar/desmarcar, o clic y arrastra para seleccionar varias celdas seguidas."}
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
                  {minutesToLabel(minute)}–{minutesToLabel(minute + SLOT_MINUTES)}
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
                          width: 36,
                          height: 24,
                          borderRadius: 3,
                          cursor: readOnly ? "default" : "pointer",
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

      {!readOnly && (
        <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {saveError && <Alert tone="danger">{saveError}</Alert>}
          {justSaved && !dirty && <Alert tone="success">Disponibilidad guardada.</Alert>}
          <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!dirty && !isSaving} style={{ alignSelf: "flex-start" }}>
            Guardar disponibilidad
          </Button>
        </div>
      )}
    </Card>
  );
}
