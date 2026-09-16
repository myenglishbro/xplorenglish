import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { ExpenseFormButton } from "./ExpenseFormButton";
import { ExpensesTable } from "./ExpensesTable";
import { useAdminExpenses, useCreateExpense } from "@/features/expensesAdmin/hooks";

/**
 * Componente autocontenido de "Otros gastos" -- pensado para montarse tal cual dentro del tab
 * "Otros gastos" de Admin -> Reportes (slice posterior). No depende de ningún filtro de mes: lista
 * todos los gastos, más reciente primero; el filtrado por periodo cuando exista Reportes se hace
 * filtrando `items` desde el componente contenedor, sin tocar este ni su query.
 */
export function ExpensesSection() {
  const expensesQuery = useAdminExpenses();
  const createMutation = useCreateExpense();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
        <h2
          style={{
            margin: 0,
            font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)",
            color: "var(--text-heading)",
          }}
        >
          Otros gastos
        </h2>
        <ExpenseFormButton
          modalTitle="Registrar gasto"
          triggerLabel="+ Registrar gasto"
          triggerVariant="primary"
          triggerIcon="plus"
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      </div>

      {expensesQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : expensesQuery.isError || !expensesQuery.data ? (
        <Alert tone="danger">No pudimos cargar los gastos. Recarga la página para intentarlo de nuevo.</Alert>
      ) : expensesQuery.data.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Todavía no hay gastos registrados"
          action={
            <ExpenseFormButton
              modalTitle="Registrar gasto"
              triggerLabel="+ Registrar gasto"
              triggerVariant="primary"
              triggerIcon="plus"
              onSubmit={(input) => createMutation.mutateAsync(input)}
            />
          }
        >
          Registra gastos administrativos (marketing, software, alquiler, etc.) para que alimenten el reporte financiero mensual.
        </EmptyState>
      ) : (
        <Card pad={false}>
          <ExpensesTable items={expensesQuery.data} />
        </Card>
      )}
    </div>
  );
}
