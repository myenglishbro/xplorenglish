import { useAdminPayrollPeriods } from "@/features/payrollAdmin/hooks";
import { useAssignableTeachers } from "@/features/classroomsAdmin/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { PayrollPeriodsTable } from "@/components/admin/payroll/PayrollPeriodsTable";
import { CreatePayrollPeriodButton } from "@/components/admin/payroll/CreatePayrollPeriodButton";
import { TeacherDebtSummary } from "@/components/admin/payroll/TeacherDebtSummary";

function sectionTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/**
 * Portado de src/app/admin/pagos-docentes/page.tsx. Slice 3: se agrega arriba el resumen
 * automático de deuda (TeacherDebtSummary, "¿cuánto debo?", sin filtros) -- la sección "Periodos
 * de pago" de abajo queda intacta, es el mecanismo existente para "qué sesiones quiero liquidar
 * ahora" (crear periodo -> comprobante -> aprobar -> marcar pagado). Ambos conceptos conviven,
 * nunca se fusionan.
 */
export function PagosDocentesListPage() {
  const periodsQuery = useAdminPayrollPeriods();
  const teachersQuery = useAssignableTeachers();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {sectionTitle("Resumen de deuda")}
        <TeacherDebtSummary teachers={teachersQuery.data ?? []} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
          {sectionTitle("Periodos de pago")}
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
    </div>
  );
}
