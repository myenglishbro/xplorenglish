import { MetricBand } from "./MetricBand";
import { formatCurrencyAmount } from "@/lib/format/currency";
import type { FinancialReportKpis } from "@/server/reports/types";

const money = (n: number) => formatCurrencyAmount(n, "PEN");

/**
 * "Costo docente generado", "Docentes pagados", "Otros gastos" -- pasan a segundo nivel (rediseño
 * UX/UI): mismos 3 valores de FinancialReport.kpis (Slice 4), sin recalcular nada. Distinto de los
 * 4 KPIs principales (ReportKpis), que conservan mayor prominencia.
 */
export function SecondaryMetricsBand({ kpis }: { kpis: FinancialReportKpis }) {
  return (
    <MetricBand
      items={[
        { label: "Costo docente generado", value: money(kpis.generatedTeacherCost) },
        { label: "Docentes pagados", value: money(kpis.paidTeachers) },
        { label: "Otros gastos", value: money(kpis.otherExpenses) },
      ]}
    />
  );
}
