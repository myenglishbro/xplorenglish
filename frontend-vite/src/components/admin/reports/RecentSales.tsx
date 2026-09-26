import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { SalesDetailItem } from "@/server/reports/types";

const VISIBLE_COUNT = 5;

export interface RecentSalesProps {
  items: SalesDetailItem[];
  /** FinancialReport.kpis.collectedIncome -- el mismo total ya reconciliado con la lista completa
   * (Slice 4), nunca se vuelve a sumar acá. */
  totalAmount: number;
  onViewAll: () => void;
}

/**
 * SUMMARY de "Ventas" (rediseño UX/UI) -- encabezado con el total del periodo YA calculado
 * (kpis.collectedIncome) y las 5 ventas más recientes de FinancialReport.sales (ya viene ordenado
 * paid_at desc, Slice 4). El detalle completo con búsqueda vive en la vista DETAIL.
 */
export function RecentSales({ items, totalAmount, onViewAll }: RecentSalesProps) {
  const columns: DataTableColumn<SalesDetailItem>[] = [
    { key: "paidAt", header: "Fecha", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "studentName", header: "Estudiante" },
    { key: "concept", header: "Concepto" },
    { key: "paymentMethod", header: "Método" },
    { key: "amount", header: "Monto", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          padding: "14px 18px",
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <span style={{ font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Ventas del periodo
        </span>
        <span style={{ font: "var(--weight-extrabold) 22px/1 var(--font-display)", color: "var(--text-heading)" }}>
          {formatCurrencyAmount(totalAmount, "PEN")}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="credit-card" title="No hay ventas registradas en este periodo">
          Cuando un estudiante complete un pago dentro del rango seleccionado, aparecerá acá.
        </EmptyState>
      ) : (
        <>
          <div>
            <div style={{ margin: "0 0 var(--space-2)", font: "var(--weight-semibold) var(--text-caption-size)/1.2 var(--font-body)", color: "var(--text-muted)" }}>
              Movimientos recientes
            </div>
            <Card pad={false}>
              <DataTable columns={columns} rows={items.slice(0, VISIBLE_COUNT)} />
            </Card>
          </div>
          {items.length > VISIBLE_COUNT && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button variant="secondary" size="sm" iconRight="arrow-right" onClick={onViewAll}>
                Ver todas las ventas ({items.length})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
