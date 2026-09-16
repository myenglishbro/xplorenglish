"use client";

import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { SalesDetailItem } from "@/server/reports/types";

/**
 * Puro detalle de FinancialReport.sales (Slice 4) -- ya viene de student_payments.amount, nunca se
 * vuelve a sumar hours_packages.price_paid acá.
 */
export function SalesTable({ items }: { items: SalesDetailItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="credit-card" title="Sin ventas en este periodo">
        Cuando un estudiante complete un pago dentro del rango seleccionado, aparecerá acá.
      </EmptyState>
    );
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const columns: DataTableColumn<SalesDetailItem>[] = [
    { key: "paidAt", header: "Fecha", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "studentName", header: "Estudiante" },
    { key: "concept", header: "Concepto" },
    { key: "paymentMethod", header: "Método" },
    { key: "amount", header: "Monto", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
  ];

  return (
    <Card
      pad={false}
      footer={
        <div style={{ textAlign: "right", font: "var(--weight-bold) var(--text-body-size)/1 var(--font-display)", color: "var(--text-heading)" }}>
          TOTAL INGRESOS DEL PERIODO: {formatCurrencyAmount(total, "PEN")}
        </div>
      }
    >
      <DataTable columns={columns} rows={items} />
    </Card>
  );
}
