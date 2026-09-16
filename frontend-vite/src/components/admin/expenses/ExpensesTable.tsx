"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { ExpenseFormButton } from "./ExpenseFormButton";
import { useUpdateExpense, useDeleteExpense } from "@/features/expensesAdmin/hooks";
import { EXPENSE_CATEGORY_LABEL, type ExpenseListItem } from "@/server/expenses/types";

/** expense_date es un `date` puro ("YYYY-MM-DD"), sin hora ni zona -- formatear con split simple,
 * nunca con new Date()/timeZone (correría el día un día para atrás en Lima, UTC-5, si se tratara
 * como un instante). Mismo criterio que formatDateOnly en PayrollPeriodsTable. */
function formatDateOnly(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function ExpensesTable({ items }: { items: ExpenseListItem[] }) {
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const columns: DataTableColumn<ExpenseListItem>[] = [
    { key: "expenseDate", header: "Fecha", render: (row) => <span style={{ whiteSpace: "nowrap" }}>{formatDateOnly(row.expenseDate)}</span> },
    { key: "category", header: "Categoría", render: (row) => EXPENSE_CATEGORY_LABEL[row.category] },
    { key: "description", header: "Descripción" },
    { key: "paymentMethod", header: "Método" },
    { key: "amount", header: "Monto", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
    {
      key: "actions",
      header: "Acciones",
      align: "right",
      render: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ExpenseFormButton
            modalTitle="Editar gasto"
            triggerLabel="Editar"
            triggerVariant="ghost"
            triggerSize="sm"
            defaultValues={{
              expenseDate: row.expenseDate,
              category: row.category,
              description: row.description,
              amount: String(row.amount),
              paymentMethod: row.paymentMethod,
              notes: row.notes ?? "",
            }}
            onSubmit={(input) => updateMutation.mutateAsync({ expenseId: row.id, input })}
          />
          <ConfirmActionButton
            label="Eliminar"
            icon="trash"
            variant="ghost"
            size="sm"
            confirmTitle="Eliminar gasto"
            confirmDescription={`Se eliminará "${row.description}" (${formatCurrencyAmount(row.amount, "PEN")}). Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            action={async () => {
              try {
                await deleteMutation.mutateAsync(row.id);
                return {};
              } catch (err) {
                return { error: err instanceof Error ? err.message : "No pudimos eliminar el gasto. Inténtalo de nuevo en unos minutos." };
              }
            }}
          />
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={items} />;
}
