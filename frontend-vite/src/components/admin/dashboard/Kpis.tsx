import { StatCard } from "@/components/ui/surfaces/StatCard";
import type { DashboardKpis, KpiValue } from "@/server/dashboard/types";

function kpiDisplayValue(kpi: KpiValue): string {
  return kpi.status === "ok" ? String(kpi.value) : "—";
}

const CURRENCY = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

export function Kpis({ kpis }: { kpis: DashboardKpis }) {
  const pending = kpis.pendingStudentPayments;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard label="Estudiantes activos" value={kpiDisplayValue(kpis.activeStudents)} icon="student" tone="accent" />
      <StatCard label="Docentes activos" value={kpiDisplayValue(kpis.activeTeachers)} icon="chalkboard-teacher" tone="accent" />
      <StatCard label="Salones activos" value={kpiDisplayValue(kpis.activeClassrooms)} icon="chalkboard" tone="accent" />
      <StatCard label="Clases de hoy" value={kpiDisplayValue(kpis.todaySessionsCount)} icon="calendar-blank" tone="brand" />
      <StatCard
        label="Pagos estudiantes pendientes"
        value={pending.status === "ok" ? `${pending.value.count} · ${CURRENCY.format(pending.value.totalAmount)}` : "—"}
        icon="credit-card"
        tone="brand"
      />
    </div>
  );
}
