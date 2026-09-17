import { formatCurrencyAmount } from "@/lib/format/currency";
import type { FinancialMonthlyTrendPoint } from "@/server/reports/types";

const SERIES = [
  { key: "collectedIncome", label: "Ingresos", color: "var(--cyan-600)" },
  { key: "generatedTeacherCost", label: "Costo docente generado", color: "var(--orange-500)" },
  { key: "otherExpenses", label: "Otros gastos", color: "var(--red-500)" },
] as const;

const CHART_HEIGHT = 180;
const BAR_WIDTH = 14;
const BAR_GAP = 4;
const GROUP_GAP = 28;
const GROUP_WIDTH = SERIES.length * BAR_WIDTH + (SERIES.length - 1) * BAR_GAP;

/**
 * SVG hecho a mano, sin librería -- 3 barras (ingresos/costo docente/otros gastos) por mes, nunca
 * pendingTeachers (es un saldo acumulado, no un gasto mensual). Fuente: getFinancialMonthlyTrend
 * (Slice 4), mismas 3 definiciones financieras aprobadas, sin recalcular nada acá.
 */
export function ReportTrendChart({ points }: { points: FinancialMonthlyTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.flatMap((p) => SERIES.map((s) => p[s.key] as number)));
  const chartWidth = points.length * (GROUP_WIDTH + GROUP_GAP);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) var(--text-caption-size)/1 var(--font-body)", color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          role="img"
          aria-label="Gráfico de barras: ingresos, costo docente y otros gastos por mes"
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 40}`}
          width={Math.max(chartWidth, 320)}
          height={CHART_HEIGHT + 40}
          style={{ display: "block" }}
        >
          <line x1={0} y1={CHART_HEIGHT} x2={chartWidth} y2={CHART_HEIGHT} stroke="var(--border-subtle)" strokeWidth={1} />
          {points.map((point, groupIndex) => {
            const groupX = groupIndex * (GROUP_WIDTH + GROUP_GAP);
            return (
              <g key={point.monthKey}>
                {SERIES.map((s, seriesIndex) => {
                  const value = point[s.key] as number;
                  const barHeight = (value / maxValue) * (CHART_HEIGHT - 8);
                  const x = groupX + seriesIndex * (BAR_WIDTH + BAR_GAP);
                  const y = CHART_HEIGHT - barHeight;
                  return (
                    <rect key={s.key} x={x} y={y} width={BAR_WIDTH} height={Math.max(barHeight, 0)} fill={s.color} rx={2}>
                      <title>
                        {point.monthLabel} · {s.label}: {formatCurrencyAmount(value, "PEN")}
                      </title>
                    </rect>
                  );
                })}
                <text x={groupX + GROUP_WIDTH / 2} y={CHART_HEIGHT + 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {point.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
