import { StatCard } from "@/components/ui/surfaces/StatCard";
import { formatCurrencyAmount } from "@/lib/format/currency";
import type { FinancialReportKpis } from "@/server/reports/types";

const money = (n: number) => formatCurrencyAmount(n, "PEN");

/**
 * Los 4 KPIs PRINCIPALES -- Ingresos, Resultado operativo, Flujo de caja, Deuda docente actual.
 * "Costo docente generado", "Docentes pagados" y "Otros gastos" viven en segundo nivel (ver
 * SecondaryMetricsBand): mismos FinancialReport.kpis (Slice 4), este componente nunca suma ni
 * resta nada, solo formatea y distribuye. operatingResult/cashFlow pueden ser negativos: se
 * muestran tal cual (Intl ya antepone el signo "-"), nunca se fuerzan a 0.
 *
 * Ajuste visual final: las 4 cards son hijas DIRECTAS del grid (sin wrapper extra alrededor de
 * Flujo de caja) -- por default de CSS Grid (align-items: stretch) las 4 quedan exactamente
 * alineadas en altura, sea cual sea su contenido; la nota de deuda docente vive DENTRO de la
 * propia card de Flujo de caja (prop `note` de StatCard), nunca fuera de su borde. `compact`
 * reduce padding/gap sin miniaturizar valor/label/icono.
 */
export function ReportKpis({ kpis }: { kpis: FinancialReportKpis }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard compact label="Ingresos" value={money(kpis.collectedIncome)} icon="credit-card" tone="accent" />
      <StatCard
        compact
        label="Resultado operativo"
        value={money(kpis.operatingResult)}
        icon={kpis.operatingResult < 0 ? "trend-down" : "chart-line-up"}
        tone="brand"
      />
      <StatCard
        compact
        label="Flujo de caja"
        value={money(kpis.cashFlow)}
        icon={kpis.cashFlow < 0 ? "trend-down" : "money"}
        tone="brand"
        note={kpis.pendingTeachers > 0 ? `${money(kpis.pendingTeachers)} de deuda docente actual -- no lo cuentes como dinero libre.` : undefined}
      />
      <StatCard compact label="Deuda docente actual" value={money(kpis.pendingTeachers)} icon="clock-countdown" tone="accent" />
    </div>
  );
}
