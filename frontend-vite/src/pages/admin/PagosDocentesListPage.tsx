import { useAdminPayrollPeriods } from "@/features/payrollAdmin/hooks";
import { useAssignableTeachers } from "@/features/classroomsAdmin/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { PayrollPeriodsTable } from "@/components/admin/payroll/PayrollPeriodsTable";
import { CreatePayrollPeriodButton } from "@/components/admin/payroll/CreatePayrollPeriodButton";

/** Portado de src/app/admin/pagos-docentes/page.tsx. */
export function PagosDocentesListPage() {
  const periodsQuery = useAdminPayrollPeriods();
  const teachersQuery = useAssignableTeachers();

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
          Pagos docentes
        </h1>
        <CreatePayrollPeriodButton teachers={teachersQuery.data ?? []} />
      </div>

      {periodsQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : periodsQuery.isError || !periodsQuery.data ? (
        <EmptyState icon="warning" title="No pudimos cargar los periodos">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <Card pad={periodsQuery.data.length === 0}>
          {periodsQuery.data.length === 0 ? (
            <EmptyState icon="credit-card" title="Todavía no hay periodos de pago">
              Crea el primero desde &quot;Crear periodo de pago&quot; para agrupar horas ya dictadas.
            </EmptyState>
          ) : (
            <PayrollPeriodsTable items={periodsQuery.data} />
          )}
        </Card>
      )}
    </div>
  );
}
