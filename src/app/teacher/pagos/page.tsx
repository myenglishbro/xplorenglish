import { createClient } from "@/lib/supabase/server";
import { listPayrollPeriods } from "@/server/payroll/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { PayrollPeriodsTable } from "@/components/admin/payroll/PayrollPeriodsTable";

/**
 * Reutiliza listPayrollPeriods (server/payroll/queries.ts) tal cual, sin ningún parámetro de
 * teacherId: RLS (teacher_payment_periods_select_own, 0008) ya acota esta query a las filas del
 * usuario autenticado, mismo criterio que getMyAvailability/getStudentHoursPackages. No hay
 * ningún parámetro público que un cliente pudiera manipular para ver periodos de otro docente.
 */
export default async function TeacherPagosPage() {
  const supabase = createClient();
  const periods = await listPayrollPeriods(supabase);

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

      <Card pad={periods.length === 0}>
        {periods.length === 0 ? (
          <EmptyState icon="credit-card" title="Todavía no tienes periodos de pago">
            Cuando el admin agrupe tus horas dictadas en un periodo, aparecerá aquí.
          </EmptyState>
        ) : (
          <PayrollPeriodsTable items={periods} basePath="/teacher/pagos" showTeacherColumn={false} />
        )}
      </Card>
    </div>
  );
}
