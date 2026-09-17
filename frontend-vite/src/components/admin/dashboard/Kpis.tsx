import { StatCard } from "@/components/ui/surfaces/StatCard";
import type { DashboardKpis, KpiValue } from "@/server/dashboard/types";

function kpiDisplayValue(kpi: KpiValue): string {
  return kpi.status === "ok" ? String(kpi.value) : "—";
}

export interface KpisProps {
  kpis: DashboardKpis;
  /** "Sin saldo" -- estudiantes activos con balance <= 0. Se calcula en DashboardPage a partir de
   * useStudentBalanceAlerts (Slice G, ver classifyStudentBalance), NUNCA una query/definición nueva
   * de saldo acá. */
  studentsWithoutBalance: KpiValue;
}

export function Kpis({ kpis, studentsWithoutBalance }: KpisProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard label="Estudiantes activos" value={kpiDisplayValue(kpis.activeStudents)} icon="student" tone="accent" />
      <StatCard label="Docentes activos" value={kpiDisplayValue(kpis.activeTeachers)} icon="chalkboard-teacher" tone="accent" />
      <StatCard label="Salones activos" value={kpiDisplayValue(kpis.activeClassrooms)} icon="chalkboard" tone="accent" />
      <StatCard label="Sin saldo" value={kpiDisplayValue(studentsWithoutBalance)} icon="warning" tone="brand" />
    </div>
  );
}
