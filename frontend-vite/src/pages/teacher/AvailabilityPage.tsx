import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { AvailabilityBlockButton } from "@/features/availability/components/AvailabilityBlockButton";
import { DeleteAvailabilityBlockButton } from "@/features/availability/components/DeleteAvailabilityBlockButton";
import { useAvailability } from "@/features/availability/hooks";
import { DAY_OF_WEEK_LABELS, type AvailabilityBlockItem } from "@/features/availability/types";

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
 * Vertical slice de Fase 1: lectura 100% browser → Supabase → RLS vía TanStack Query
 * (useAvailability). Mutaciones van por el Route Handler seguro (ver features/availability/api.ts)
 * -- ninguna de las dos cosas usa useEffect para fetching, tal como se pidió.
 */
export function AvailabilityPage() {
  const { data: blocks, isLoading, isError, error, refetch } = useAvailability();
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
        <AvailabilityBlockButton mode="create" triggerLabel="Agregar disponibilidad" triggerVariant="primary" triggerIcon="plus" />
      </div>

      <Card pad={isLoading || isError || groups.length === 0}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
            <Spinner size={24} label="Cargando disponibilidad…" />
          </div>
        ) : isError ? (
          <Alert tone="danger">
            No pudimos cargar tu disponibilidad ({error instanceof Error ? error.message : "error desconocido"}).{" "}
            <button
              type="button"
              onClick={() => refetch()}
              style={{ textDecoration: "underline", background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
            >
              Reintentar
            </button>
          </Alert>
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
                          <AvailabilityBlockButton mode="edit" block={block} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" />
                          <DeleteAvailabilityBlockButton blockId={block.id} timeRangeLabel={timeRangeLabel} />
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
