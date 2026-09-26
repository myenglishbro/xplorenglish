"use client";

import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Input } from "@/components/ui/forms/Input";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { TeacherCostDetailItem } from "@/server/reports/types";

/**
 * DETALLE COMPLETO de costo GENERADO DURANTE EL PERIODO (FinancialReport.teachers, Slice 4) --
 * deliberadamente distinta de Admin -> Pagos a profesores (deuda acumulada, Slice 3). Vista de
 * detalle (rediseño UX/UI): todos los docentes + búsqueda local, la vista resumida vive en
 * RecentTeacherCosts. La búsqueda es SOLO presentación sobre `items` ya cargado: nunca dispara una
 * query nueva ni recalcula ningún costo.
 */
export function TeacherCostTable({ items }: { items: TeacherCostDetailItem[] }) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.teacherName.toLowerCase().includes(q));
  }, [items, search]);

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
      <div style={{ maxWidth: 320 }}>
        <Input icon="magnifying-glass" placeholder="Buscar profesor…" value={search} onChange={(e) => setSearch(e.target.value)} size="sm" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="magnifying-glass" title="Sin resultados">
          Ningún profesor coincide con "{search}".
        </EmptyState>
      ) : (
        <Card pad={false}>
          <DataTable columns={columns} rows={filtered} />
        </Card>
      )}
    </div>
  );
}
