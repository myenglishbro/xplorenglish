import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { getMonthRangeInLima, getCustomRangeInLima } from "@/lib/datetime/lima";
import { useFinancialReport, useFinancialMonthlyTrend } from "@/features/reportsAdmin/hooks";
import { ReportPeriodSelector, type CustomRange } from "@/components/admin/reports/ReportPeriodSelector";
import { ReportKpis } from "@/components/admin/reports/ReportKpis";
import { ReportTrendChart } from "@/components/admin/reports/ReportTrendChart";
import { SalesTable } from "@/components/admin/reports/SalesTable";
import { TeacherCostTable } from "@/components/admin/reports/TeacherCostTable";
import { ExpensesSection } from "@/components/admin/expenses/ExpensesSection";

type ReportTab = "sales" | "teachers" | "expenses";
const TAB_ITEMS = [
  { value: "sales", label: "Ventas" },
  { value: "teachers", label: "Profesores" },
  { value: "expenses", label: "Otros gastos" },
];

/**
 * Reemplaza el placeholder. Consume EXCLUSIVAMENTE getFinancialReport/getFinancialMonthlyTrend
 * (Slice 4) vía useFinancialReport/useFinancialMonthlyTrend -- ninguna fórmula financiera vive
 * acá, solo formateo y distribución de lo que esos hooks devuelven. El periodo (mes o rango
 * personalizado) vive en estado local de esta página, no en la URL: al refrescar la página vuelve
 * deliberadamente al mes actual (punto 1 del slice), igual que cualquier otra pantalla admin de
 * este proyecto que no persiste filtros en query params.
 */
export function ReportesPage() {
  const [anchorDate, setAnchorDate] = React.useState<Date>(() => new Date());
  const [customRange, setCustomRange] = React.useState<CustomRange | null>(null);
  const [activeTab, setActiveTab] = React.useState<ReportTab>("sales");

  const range = customRange ? getCustomRangeInLima(customRange.startDate, customRange.endDate) : getMonthRangeInLima(anchorDate);

  const reportQuery = useFinancialReport(range);
  const trendQuery = useFinancialMonthlyTrend(6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Reporte financiero
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Resumen de ingresos, costos y gastos de la academia</p>
      </div>

      <ReportPeriodSelector anchorDate={anchorDate} customRange={customRange} onChangeAnchor={setAnchorDate} onChangeCustomRange={setCustomRange} />

      {reportQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Calculando el reporte…" />
        </div>
      ) : reportQuery.isError || !reportQuery.data ? (
        <Alert tone="danger">No pudimos calcular el reporte financiero. Recarga la página para intentarlo de nuevo.</Alert>
      ) : (
        <>
          <ReportKpis kpis={reportQuery.data.kpis} />

          <Card
            header={
              <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
                Ingresos vs. gastos (últimos 6 meses)
              </h2>
            }
          >
            {trendQuery.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
                <Spinner size={24} label="Cargando tendencia…" />
              </div>
            ) : trendQuery.isError || !trendQuery.data ? (
              <Alert tone="danger">No pudimos cargar la tendencia mensual.</Alert>
            ) : (
              <ReportTrendChart points={trendQuery.data} />
            )}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Tabs items={TAB_ITEMS} value={activeTab} onChange={(v) => setActiveTab(v as ReportTab)} />

            {activeTab === "sales" && <SalesTable items={reportQuery.data.sales} />}
            {activeTab === "teachers" && (
              <TeacherCostTable
                items={reportQuery.data.teachers}
                generatedInPeriod={reportQuery.data.kpis.generatedTeacherCost}
                pendingTotal={reportQuery.data.kpis.pendingTeachers}
              />
            )}
            {activeTab === "expenses" && <ExpensesSection />}
          </div>
        </>
      )}
    </div>
  );
}
