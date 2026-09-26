import React from "react";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Select } from "@/components/ui/forms/Select";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { getMonthRangeInLima, getCustomRangeInLima } from "@/lib/datetime/lima";
import { useFinancialReport, useFinancialMonthlyTrend, useTeacherPaymentsByClassDate } from "@/features/reportsAdmin/hooks";
import { ReportPeriodSelector, type CustomRange } from "@/components/admin/reports/ReportPeriodSelector";
import { ReportKpis } from "@/components/admin/reports/ReportKpis";
import { SecondaryMetricsBand } from "@/components/admin/reports/SecondaryMetricsBand";
import { FinancialTrendSection } from "@/components/admin/reports/FinancialTrendSection";
import { ReportDetailHeader } from "@/components/admin/reports/ReportDetailHeader";
import { RecentSales } from "@/components/admin/reports/RecentSales";
import { SalesTable } from "@/components/admin/reports/SalesTable";
import { RecentTeacherCosts } from "@/components/admin/reports/RecentTeacherCosts";
import { TeacherCostTable } from "@/components/admin/reports/TeacherCostTable";
import { TeacherPaymentsTable } from "@/components/admin/reports/TeacherPaymentsTable";
import { RecentExpenses } from "@/components/admin/reports/RecentExpenses";
import { ExpensesSection } from "@/components/admin/expenses/ExpensesSection";
import type { TeacherPaymentPeriodMode, TeacherPaymentDetailItem } from "@/server/reports/types";
import type { LimaDateRange } from "@/lib/datetime/lima";

const TEACHER_PAYMENT_PERIOD_MODE_OPTIONS = [
  { value: "payment_date", label: "Fecha de pago" },
  { value: "class_date", label: "Fecha de clase" },
];

type ReportTab = "sales" | "teachers" | "expenses";
const TAB_ITEMS = [
  { value: "sales", label: "Ventas" },
  { value: "teachers", label: "Profesores" },
  { value: "expenses", label: "Otros gastos" },
];

type SalesView = "summary" | "detail";
type ExpensesView = "summary" | "detail";
/** "payments"/"costs" son los dos datasets DISTINTOS del tab Profesores (nunca se mezclan, ver
 * REDISEÑO FINAL §O) -- solo uno puede estar en detalle a la vez, evitando dos tablas completas
 * abiertas simultáneamente. */
type TeachersView = "summary" | "payments" | "costs";

const TAB_HEADING_STYLE: React.CSSProperties = {
  margin: "0 0 2px",
  font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)",
  color: "var(--text-heading)",
};

const HELPER_TEXT_STYLE: React.CSSProperties = {
  margin: "2px 0 0",
  font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
  color: "var(--text-subtle)",
};

function TeacherPaymentPeriodModeSelect({ value, onChange }: { value: TeacherPaymentPeriodMode; onChange: (next: TeacherPaymentPeriodMode) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <span style={{ font: "var(--weight-medium) var(--text-small-size)/1 var(--font-body)", color: "var(--text-muted)" }}>Filtrar periodo por:</span>
      <div style={{ width: 200 }}>
        <Select value={value} options={TEACHER_PAYMENT_PERIOD_MODE_OPTIONS} onChange={(e) => onChange(e.target.value as TeacherPaymentPeriodMode)} />
      </div>
    </div>
  );
}

/**
 * Resuelve qué dataset renderizar en TeacherPaymentsTable según el modo -- ramifica sobre el
 * literal `mode` (nunca sobre una variable ya ensanchada) para que TypeScript conserve la relación
 * discriminada `mode`/`items` de TeacherPaymentsTableProps. También evita duplicar el manejo de
 * loading/error de `classDateQuery` en los dos call-sites (SUMMARY y DETAIL).
 */
function TeacherPaymentsSection({
  mode,
  paymentDateItems,
  classDateQuery,
  range,
  limit,
  onViewAll,
}: {
  mode: TeacherPaymentPeriodMode;
  paymentDateItems: TeacherPaymentDetailItem[];
  classDateQuery: ReturnType<typeof useTeacherPaymentsByClassDate>;
  range: LimaDateRange;
  limit?: number;
  onViewAll?: () => void;
}) {
  if (mode === "payment_date") {
    return <TeacherPaymentsTable mode="payment_date" items={paymentDateItems} range={range} limit={limit} onViewAll={onViewAll} />;
  }
  if (classDateQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
        <Spinner size={24} label="Calculando clases pagadas del periodo…" />
      </div>
    );
  }
  if (classDateQuery.isError || !classDateQuery.data) {
    return <Alert tone="danger">No pudimos calcular las clases pagadas de este periodo.</Alert>;
  }
  return <TeacherPaymentsTable mode="class_date" items={classDateQuery.data} range={range} limit={limit} onViewAll={onViewAll} />;
}

/**
 * Consume EXCLUSIVAMENTE getFinancialReport/getFinancialMonthlyTrend (Slice 4) vía
 * useFinancialReport/useFinancialMonthlyTrend -- ninguna fórmula financiera vive acá, solo
 * formateo y distribución de lo que esos hooks devuelven. El periodo (mes o rango personalizado)
 * vive en estado local de esta página, no en la URL: al refrescar la página vuelve
 * deliberadamente al mes actual.
 *
 * Jerarquía final (rediseño UX/UI): cabecera -> periodo -> 4 KPIs principales -> métricas
 * secundarias -> tendencia financiera (SIEMPRE visible, compacta) -> tabs -> contenido
 * resumido/contextual del tab -> detalle completo bajo demanda (patrón SUMMARY/DETAIL, estado
 * local de presentación por sección, sin rutas/URL/backend nuevos). Cambiar el periodo principal
 * regresa todas las secciones a SUMMARY, para no dejar al usuario viendo un detalle de un
 * contexto anterior.
 */
export function ReportesPage() {
  const [anchorDate, setAnchorDate] = React.useState<Date>(() => new Date());
  const [customRange, setCustomRange] = React.useState<CustomRange | null>(null);
  const [activeTab, setActiveTab] = React.useState<ReportTab>("sales");

  const [salesView, setSalesView] = React.useState<SalesView>("summary");
  const [salesSearch, setSalesSearch] = React.useState("");
  const [expensesView, setExpensesView] = React.useState<ExpensesView>("summary");
  const [teachersView, setTeachersView] = React.useState<TeachersView>("summary");
  /** Default "payment_date" preserva EXACTAMENTE el comportamiento actual al abrir el reporte
   * (mejora posterior a la Segunda Etapa, commit 6c6292d). */
  const [teacherPaymentPeriodMode, setTeacherPaymentPeriodMode] = React.useState<TeacherPaymentPeriodMode>("payment_date");

  const range = customRange ? getCustomRangeInLima(customRange.startDate, customRange.endDate) : getMonthRangeInLima(anchorDate);

  const reportQuery = useFinancialReport(range);
  const trendQuery = useFinancialMonthlyTrend(6);
  const teacherPaymentsByClassDateQuery = useTeacherPaymentsByClassDate(range, teacherPaymentPeriodMode === "class_date");

  // Cambiar de periodo regresa todas las secciones a SUMMARY (§V del rediseño) -- evita que el
  // usuario quede viendo un detalle/búsqueda de un rango que ya no es el seleccionado.
  React.useEffect(() => {
    setSalesView("summary");
    setSalesSearch("");
    setExpensesView("summary");
    setTeachersView("summary");
  }, [range.startDate, range.endDate]);

  const filteredSales = React.useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    const sales = reportQuery.data?.sales ?? [];
    if (!q) return sales;
    return sales.filter((s) => s.studentName.toLowerCase().includes(q) || s.concept.toLowerCase().includes(q) || s.paymentMethod.toLowerCase().includes(q));
  }, [reportQuery.data?.sales, salesSearch]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
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
          <SecondaryMetricsBand kpis={reportQuery.data.kpis} />
          <FinancialTrendSection points={trendQuery.data} isLoading={trendQuery.isLoading} isError={trendQuery.isError} />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Tabs items={TAB_ITEMS} value={activeTab} onChange={(v) => setActiveTab(v as ReportTab)} />

            {/* ================================ VENTAS ================================ */}
            {activeTab === "sales" &&
              (salesView === "summary" ? (
                <RecentSales
                  items={reportQuery.data.sales}
                  totalAmount={reportQuery.data.kpis.collectedIncome}
                  onViewAll={() => setSalesView("detail")}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <ReportDetailHeader title="Todas las ventas del periodo" onBack={() => setSalesView("summary")} />
                  <div style={{ maxWidth: 320 }}>
                    <Input icon="magnifying-glass" placeholder="Buscar venta…" value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} size="sm" />
                  </div>
                  {salesSearch.trim() && (
                    <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
                      {filteredSales.length} de {reportQuery.data.sales.length} ventas
                    </span>
                  )}
                  <SalesTable items={reportQuery.data.sales} displayItems={filteredSales} />
                </div>
              ))}

            {/* ================================ PROFESORES ================================ */}
            {activeTab === "teachers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {teachersView === "summary" && (
                  <>
                    <div>
                      <h3 style={TAB_HEADING_STYLE}>Pagos realizados</h3>
                      <p style={HELPER_TEXT_STYLE}>Dinero efectivamente pagado a docentes.</p>

                      <div style={{ margin: "var(--space-3) 0" }}>
                        <TeacherPaymentPeriodModeSelect value={teacherPaymentPeriodMode} onChange={setTeacherPaymentPeriodMode} />
                      </div>

                      <TeacherPaymentsSection
                        mode={teacherPaymentPeriodMode}
                        paymentDateItems={reportQuery.data.teacherPayments}
                        classDateQuery={teacherPaymentsByClassDateQuery}
                        range={range}
                        limit={5}
                        onViewAll={() => setTeachersView("payments")}
                      />
                    </div>

                    <div>
                      <h3 style={TAB_HEADING_STYLE}>Costo generado por docente</h3>
                      <p style={HELPER_TEXT_STYLE}>Costo originado por clases realizadas, se haya pagado o no.</p>
                      <div style={{ marginTop: "var(--space-3)" }}>
                        <RecentTeacherCosts items={reportQuery.data.teachers} onViewAll={() => setTeachersView("costs")} />
                      </div>
                    </div>
                  </>
                )}

                {teachersView === "payments" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <ReportDetailHeader title="Todos los pagos a docentes" onBack={() => setTeachersView("summary")} />

                    <TeacherPaymentPeriodModeSelect value={teacherPaymentPeriodMode} onChange={setTeacherPaymentPeriodMode} />

                    <TeacherPaymentsSection
                      mode={teacherPaymentPeriodMode}
                      paymentDateItems={reportQuery.data.teacherPayments}
                      classDateQuery={teacherPaymentsByClassDateQuery}
                      range={range}
                    />
                  </div>
                )}

                {teachersView === "costs" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <ReportDetailHeader title="Todos los profesores" onBack={() => setTeachersView("summary")} />
                    <TeacherCostTable items={reportQuery.data.teachers} />
                  </div>
                )}
              </div>
            )}

            {/* ================================ OTROS GASTOS ================================ */}
            {activeTab === "expenses" &&
              (expensesView === "summary" ? (
                <RecentExpenses
                  items={reportQuery.data.expenses}
                  totalAmount={reportQuery.data.kpis.otherExpenses}
                  onViewAll={() => setExpensesView("detail")}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => setExpensesView("summary")} style={{ alignSelf: "flex-start" }}>
                    Volver al resumen
                  </Button>
                  <ExpensesSection />
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
