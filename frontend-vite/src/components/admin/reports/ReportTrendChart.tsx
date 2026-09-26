"use client";

import React from "react";
import { formatCurrencyAmount } from "@/lib/format/currency";
import type { FinancialMonthlyTrendPoint } from "@/server/reports/types";

const SERIES = [
  { key: "collectedIncome", label: "Ingresos", color: "var(--cyan-600)" },
  { key: "generatedTeacherCost", label: "Costo docente generado", color: "var(--orange-500)" },
  { key: "otherExpenses", label: "Otros gastos", color: "var(--red-500)" },
] as const;

/** Área útil de las barras (sin el renglón de meses debajo) -- objetivo de ajuste visual final:
 * 160-180px en desktop, considerablemente más compacto que antes. */
const CHART_HEIGHT = 150;
const LABEL_HEIGHT = 24;
const BAR_GAP = 4;
const MIN_BAR_WIDTH = 9;
const GROUP_PADDING_RATIO = 0.16;

/**
 * SVG hecho a mano, sin librería -- 3 barras (ingresos/costo docente/otros gastos) por mes, nunca
 * pendingTeachers (es un saldo acumulado, no un gasto mensual). Fuente: getFinancialMonthlyTrend
 * (Slice 4), mismas 3 definiciones financieras aprobadas, sin recalcular nada acá.
 *
 * Ajuste visual (viewBox medido con ResizeObserver del ancho REAL del contenedor, en vez de un
 * ancho fijo en px derivado de constantes de barra/gap) -- causa del bug anterior: el viewBox/width
 * del SVG se calculaba SOLO a partir de BAR_WIDTH/GAP fijos (~468px), nunca del ancho disponible de
 * la Card, así que los 6 meses quedaban comprimidos a la izquierda sin importar cuán ancho fuera su
 * contenedor. Acá los grupos se reparten en `groupSlot = anchoDisponible / meses`, así que SIEMPRE
 * ocupan el ancho completo. Si el contenedor es tan angosto que el ancho de barra caería bajo
 * MIN_BAR_WIDTH (legibilidad), el SVG usa su ancho mínimo real y el wrapper habilita scroll
 * horizontal (mismo fallback que antes), en vez de comprimir las barras hasta ilegibles.
 */
export function ReportTrendChart({ points }: { points: FinancialMonthlyTrendPoint[] }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(1, ...points.flatMap((p) => SERIES.map((s) => p[s.key] as number)));

  const groupCount = Math.max(points.length, 1);
  const availableSlot = containerWidth > 0 ? containerWidth / groupCount : 0;
  const groupPadding = availableSlot * GROUP_PADDING_RATIO;
  const innerWidth = Math.max(0, availableSlot - groupPadding * 2);
  const rawBarWidth = (innerWidth - BAR_GAP * (SERIES.length - 1)) / SERIES.length;
  const barWidth = Math.max(MIN_BAR_WIDTH, rawBarWidth);
  const needsScroll = containerWidth > 0 && rawBarWidth < MIN_BAR_WIDTH;
  const groupSlot = needsScroll ? barWidth * SERIES.length + BAR_GAP * (SERIES.length - 1) + groupPadding * 2 : availableSlot;
  const svgWidth = needsScroll ? groupSlot * groupCount : containerWidth;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) var(--text-caption-size)/1 var(--font-body)", color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={containerRef} style={{ width: "100%", overflowX: needsScroll ? "auto" : "visible", minHeight: CHART_HEIGHT + LABEL_HEIGHT }}>
        {containerWidth > 0 && (
          <svg
            role="img"
            aria-label="Gráfico de barras: ingresos, costo docente y otros gastos por mes"
            viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT + LABEL_HEIGHT}`}
            width={needsScroll ? svgWidth : "100%"}
            height={CHART_HEIGHT + LABEL_HEIGHT}
            style={{ display: "block" }}
            preserveAspectRatio="xMinYMid meet"
          >
            <line x1={0} y1={CHART_HEIGHT} x2={svgWidth} y2={CHART_HEIGHT} stroke="var(--border-subtle)" strokeWidth={1} />
            {points.map((point, groupIndex) => {
              const groupX = groupIndex * groupSlot + groupPadding;
              return (
                <g key={point.monthKey}>
                  {SERIES.map((s, seriesIndex) => {
                    const value = point[s.key] as number;
                    const barHeight = (value / maxValue) * (CHART_HEIGHT - 8);
                    const x = groupX + seriesIndex * (barWidth + BAR_GAP);
                    const y = CHART_HEIGHT - barHeight;
                    return (
                      <rect key={s.key} x={x} y={y} width={barWidth} height={Math.max(barHeight, 0)} fill={s.color} rx={2}>
                        <title>
                          {point.monthLabel} · {s.label}: {formatCurrencyAmount(value, "PEN")}
                        </title>
                      </rect>
                    );
                  })}
                  <text x={groupIndex * groupSlot + groupSlot / 2} y={CHART_HEIGHT + 17} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                    {point.monthLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
