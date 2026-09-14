import { usePayrollPeriods } from "@/features/payroll/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { PayrollPeriodsTable } from "@/components/admin/payroll/PayrollPeriodsTable";

export function TeacherPagosPage() {
  const { data: periods, isLoading, isError } = usePayrollPeriods();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Mis pagos
      </h1>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando pagos…" />
        </div>
      ) : isError || !periods ? (
        <Alert tone="danger">No pudimos cargar tus pagos. Recarga la página.</Alert>
      ) : (
        <Card pad={periods.length === 0}>
          {periods.length === 0 ? (
            <EmptyState icon="credit-card" title="Todavía no tienes periodos de pago">
              Cuando el admin agrupe tus horas dictadas en un periodo, aparecerá aquí.
            </EmptyState>
          ) : (
            <PayrollPeriodsTable items={periods} basePath="/teacher/pagos" showTeacherColumn={false} />
          )}
        </Card>
      )}
    </div>
  );
}
