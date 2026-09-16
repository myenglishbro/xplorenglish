"use client";

import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { TeacherCostDetailItem } from "@/server/reports/types";

export interface TeacherCostTableProps {
  items: TeacherCostDetailItem[];
  /** Costo docente GENERADO en el periodo (FinancialReport.kpis.generatedTeacherCost) -- distinto
   * de pendingTeachers de abajo, que es la deuda acumulada a la fecha (Slice 3), no del periodo. */
  generatedInPeriod: number;
  pendingTotal: number;
}

/**
 * Tabla de COSTO GENERADO DURANTE EL PERIODO (FinancialReport.teachers, Slice 4) -- deliberadamente
 * distinta de Admin -> Pagos a profesores (deuda acumulada, Slice 3). Ambos números se muestran
 * juntos arriba para que nunca se confundan.
 */
export function TeacherCostTable({ items, generatedInPeriod, pendingTotal }: TeacherCostTableProps) {
  const columns: DataTableColumn<TeacherCostDetailItem>[] = [
    { key: "teacherName", header: "Profesor" },
    { key: "minutes", header: "Tiempo trabajado", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "amount", header: "Costo generado", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Costo docente del periodo" value={formatCurrencyAmount(generatedInPeriod, "PEN")} icon="chalkboard-teacher" tone="accent" />
        <StatCard label="Pendiente total actual (todos los meses)" value={formatCurrencyAmount(pendingTotal, "PEN")} icon="clock-countdown" tone="brand" />
      </div>

      {items.length === 0 ? (
        <EmptyState icon="chalkboard-teacher" title="Sin clases dictadas en este periodo">
          Cuando se completen sesiones dentro del rango seleccionado, el costo docente aparecerá acá.
        </EmptyState>
      ) : (
        <Card pad={false}>
          <DataTable columns={columns} rows={items} />
        </Card>
      )}
    </div>
  );
}
