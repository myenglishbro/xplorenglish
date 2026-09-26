import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { TeacherCostDetailItem } from "@/server/reports/types";

const VISIBLE_COUNT = 5;

export interface RecentTeacherCostsProps {
  items: TeacherCostDetailItem[];
  onViewAll: () => void;
}

/**
 * SUMMARY de "Costo generado por docente" (rediseño UX/UI) -- máximo 5 filas de
 * FinancialReport.teachers, sin buscador (la búsqueda vive en el DETAIL, ver TeacherCostTable).
 * Ningún dato se recalcula: mismos `items` que antes, solo se muestra un subconjunto.
 */
export function RecentTeacherCosts({ items, onViewAll }: RecentTeacherCostsProps) {
  const columns: DataTableColumn<TeacherCostDetailItem>[] = [
    { key: "teacherName", header: "Profesor" },
    { key: "minutes", header: "Tiempo trabajado", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "amount", header: "Costo docente generado", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
  ];

  if (items.length === 0) {
    return (
      <EmptyState icon="chalkboard-teacher" title="No hay costo docente generado en este periodo">
        Cuando se completen sesiones dentro del rango seleccionado, el costo docente aparecerá acá.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Card pad={false}>
        <DataTable columns={columns} rows={items.slice(0, VISIBLE_COUNT)} />
      </Card>
      {items.length > VISIBLE_COUNT && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button variant="secondary" size="sm" iconRight="arrow-right" onClick={onViewAll}>
            Ver todos los profesores ({items.length})
          </Button>
        </div>
      )}
    </div>
  );
}
