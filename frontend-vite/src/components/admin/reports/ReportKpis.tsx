import { StatCard } from "@/components/ui/surfaces/StatCard";
import { formatCurrencyAmount } from "@/lib/format/currency";
import type { FinancialReportKpis } from "@/server/reports/types";

const money = (n: number) => formatCurrencyAmount(n, "PEN");

/**
 * Los 7 valores vienen tal cual de FinancialReport.kpis (Slice 4) -- este componente nunca suma ni
 * resta nada, solo formatea y distribuye. operatingResult/cashFlow pueden ser negativos: se
 * muestran tal cual (Intl ya antepone el signo "-"), nunca se fuerzan a 0.
 */
export function ReportKpis({ kpis }: { kpis: FinancialReportKpis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Ingresos" value={money(kpis.collectedIncome)} icon="credit-card" tone="accent" />
        <StatCard label="Costo docente generado" value={money(kpis.generatedTeacherCost)} icon="chalkboard-teacher" tone="accent" />
        <StatCard label="Otros gastos" value={money(kpis.otherExpenses)} icon="receipt" tone="accent" />
        <StatCard
          label="Resultado operativo"
          value={money(kpis.operatingResult)}
          icon={kpis.operatingResult < 0 ? "trend-down" : "chart-line-up"}
          tone="brand"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Docentes pagados" value={money(kpis.paidTeachers)} icon="check-circle" tone="accent" />
        <StatCard label="Deuda docente actual" value={money(kpis.pendingTeachers)} icon="clock-countdown" tone="accent" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <StatCard
            label="Flujo de caja"
            value={money(kpis.cashFlow)}
            icon={kpis.cashFlow < 0 ? "trend-down" : "money"}
            tone="brand"
          />
          {kpis.pendingTeachers > 0 && (
            <span style={{ font: "var(--weight-medium) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)", padding: "0 4px" }}>
              {money(kpis.pendingTeachers)} de deuda docente actual -- no lo cuentes como dinero libre.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
