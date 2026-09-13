import { createClient } from "@/lib/supabase/server";
import { listPayrollPeriods } from "@/server/payroll/queries";
import { listAssignableTeachers } from "@/server/admin/classrooms/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { PayrollPeriodsTable } from "@/components/admin/payroll/PayrollPeriodsTable";
import { CreatePayrollPeriodButton } from "@/components/admin/payroll/CreatePayrollPeriodButton";

export default async function AdminPagosDocentesPage() {
  const supabase = createClient();

  // Independientes entre sí -- corren en paralelo.
  const [periods, teachers] = await Promise.all([listPayrollPeriods(supabase), listAssignableTeachers(supabase)]);

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
        <CreatePayrollPeriodButton teachers={teachers} />
      </div>

      <Card pad={periods.length === 0}>
        {periods.length === 0 ? (
          <EmptyState icon="credit-card" title="Todavía no hay periodos de pago">
            Crea el primero desde &quot;Crear periodo de pago&quot; para agrupar horas ya dictadas.
          </EmptyState>
        ) : (
          <PayrollPeriodsTable items={periods} />
        )}
      </Card>
    </div>
  );
}
