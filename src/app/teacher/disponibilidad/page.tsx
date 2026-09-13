"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyAvailability } from "@/server/teacher/availability/queries";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";
import type { AvailabilityBlockItem } from "@/server/teacher/availability/types";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { AvailabilityBlockButton } from "@/components/teacher/availability/AvailabilityBlockButton";
import { DeleteAvailabilityBlockButton } from "@/components/teacher/availability/DeleteAvailabilityBlockButton";

interface DayGroup {
  dayOfWeek: number;
  blocks: AvailabilityBlockItem[];
}

/** blocks ya viene ordenado day_of_week/start_time (getMyAvailability) -- Map conserva el orden
 * de primera inserción, así que los grupos resultantes también quedan en ese mismo orden. */
function groupByDay(blocks: AvailabilityBlockItem[]): DayGroup[] {
  const groups = new Map<number, AvailabilityBlockItem[]>();
  for (const block of blocks) {
    const list = groups.get(block.dayOfWeek) ?? [];
    list.push(block);
    groups.set(block.dayOfWeek, list);
  }
  return [...groups.entries()].map(([dayOfWeek, dayBlocks]) => ({ dayOfWeek, blocks: dayBlocks }));
}

/**
 * PILOTO 1A: lectura client-side (Supabase Browser Client), sin pasar por un Server Component.
 * getMyAvailability() es la MISMA función de server/teacher/availability/queries.ts -- su firma
 * ya toma un SupabaseClient<Database> genérico, así que funciona igual con el cliente browser;
 * RLS (teacher_availability_owner) sigue siendo la única autoridad que acota esta query a las
 * filas del usuario autenticado, exactamente como antes. TeacherLayout (fuera de alcance de este
 * piloto) sigue siendo el único punto que redirige "no logueado -> /login" / "rol incorrecto ->
 * home" -- esta página nunca decide eso, solo lee datos ya autorizados por RLS.
 */
export default function TeacherDisponibilidadPage() {
  const [blocks, setBlocks] = React.useState<AvailabilityBlockItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    const supabase = createClient();
    try {
      const data = await getMyAvailability(supabase);
      setBlocks(data);
      setError(null);
    } catch {
      setError("No pudimos cargar tu disponibilidad. Inténtalo de nuevo en unos minutos.");
    }
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  const groups = blocks ? groupByDay(blocks) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Mi disponibilidad
        </h1>
        <AvailabilityBlockButton mode="create" triggerLabel="Agregar disponibilidad" triggerVariant="primary" triggerIcon="plus" onSaved={refetch} />
      </div>

      <Card pad={blocks === null || !!error || groups.length === 0}>
        {blocks === null && !error ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
            <Spinner size={24} label="Cargando disponibilidad…" />
          </div>
        ) : error ? (
          <Alert tone="danger">{error}</Alert>
        ) : groups.length === 0 ? (
          <EmptyState icon="calendar-check" title="Todavía no registraste disponibilidad">
            Agrega tu primer bloque para que el admin sepa cuándo puedes dictar clases.
          </EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {groups.map((group) => (
              <div key={group.dayOfWeek}>
                <h3
                  style={{
                    margin: "0 0 var(--space-2)",
                    font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)",
                    color: "var(--text-heading)",
                  }}
                >
                  {DAY_OF_WEEK_LABELS[group.dayOfWeek]}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {group.blocks.map((block) => {
                    const timeRangeLabel = `${block.startTime.slice(0, 5)} – ${block.endTime.slice(0, 5)}`;
                    return (
                      <div
                        key={block.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 14px",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-card)",
                        }}
                      >
                        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                          {timeRangeLabel}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <AvailabilityBlockButton mode="edit" block={block} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" onSaved={refetch} />
                          <DeleteAvailabilityBlockButton blockId={block.id} timeRangeLabel={timeRangeLabel} onDeleted={refetch} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
