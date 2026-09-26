import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ExpenseFormButton } from "@/components/admin/expenses/ExpenseFormButton";
import { useCreateExpense } from "@/features/expensesAdmin/hooks";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { EXPENSE_CATEGORY_LABEL } from "@/server/expenses/types";
import type { ExpenseDetailItem } from "@/server/reports/types";

const VISIBLE_COUNT = 5;

/** expense_date es un `date` puro ("YYYY-MM-DD"), sin hora ni zona -- formatear con split simple,
 * mismo criterio que ExpensesTable/PayrollPeriodsTable (nunca new Date()/timeZone acá). */
function formatDateOnly(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export interface RecentExpensesProps {
  items: ExpenseDetailItem[];
  /** FinancialReport.kpis.otherExpenses -- mismo total ya reconciliado (Slice 4), sin recalcular. */
  totalAmount: number;
  onViewAll: () => void;
}

/**
 * SUMMARY de "Otros gastos" (rediseño UX/UI) -- encabezado con el total del periodo YA calculado
 * (kpis.otherExpenses) y los 5 gastos más recientes de FinancialReport.expenses (Slice 4, solo
 * lectura). El registro/edición/eliminación completos viven en la vista DETAIL (ExpensesSection,
 * sin cambios), que además lista TODOS los gastos históricos (no solo los del periodo) -- por
 * diseño previo del módulo, ver ExpensesSection.
 */
export function RecentExpenses({ items, totalAmount, onViewAll }: RecentExpensesProps) {
  const createMutation = useCreateExpense();

  const columns: DataTableColumn<ExpenseDetailItem>[] = [
    { key: "expenseDate", header: "Fecha", render: (row) => formatDateOnly(row.expenseDate) },
    { key: "category", header: "Categoría", render: (row) => EXPENSE_CATEGORY_LABEL[row.category] },
    { key: "description", header: "Descripción" },
    { key: "amount", header: "Monto", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            flex: "1 1 260px",
            padding: "14px 18px",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <span style={{ font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
            Otros gastos del periodo
          </span>
          <span style={{ font: "var(--weight-extrabold) 22px/1 var(--font-display)", color: "var(--text-heading)" }}>
            {formatCurrencyAmount(totalAmount, "PEN")}
          </span>
        </div>
        <ExpenseFormButton
          modalTitle="Registrar gasto"
          triggerLabel="+ Registrar gasto"
          triggerVariant="primary"
          triggerSize="sm"
          triggerIcon="plus"
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon="receipt" title="No hay gastos registrados en este periodo">
          Registra gastos administrativos (marketing, software, alquiler, etc.) para que alimenten el reporte financiero.
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
                Ver todos los gastos ({items.length})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
