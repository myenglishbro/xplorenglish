import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { ReportTrendChart } from "./ReportTrendChart";
import type { FinancialMonthlyTrendPoint } from "@/server/reports/types";

export interface FinancialTrendSectionProps {
  points: FinancialMonthlyTrendPoint[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * "Tendencia financiera" -- SIEMPRE visible (rediseño UX/UI final: sin collapse/expand, ver
 * REDISEÑO FINAL §E), justo antes de los tabs. El gráfico (ReportTrendChart) no cambia: mismos
 * datasets/series/cálculos, solo el encabezado envolvente. Altura ya compacta (~220px totales,
 * CHART_HEIGHT=180 + eje), sin necesidad de tocar ReportTrendChart internamente.
 */
export function FinancialTrendSection({ points, isLoading, isError }: FinancialTrendSectionProps) {
  return (
    <Card
      header={
        <div>
          <div style={{ font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
            Tendencia financiera
          </div>
          <div style={{ font: "var(--weight-regular) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)", marginTop: 2 }}>
            Últimos 6 meses
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
          <Spinner size={22} label="Cargando tendencia…" />
        </div>
      ) : isError || !points ? (
        <Alert tone="danger">No pudimos cargar la tendencia mensual.</Alert>
      ) : (
        <ReportTrendChart points={points} />
      )}
    </Card>
  );
}
