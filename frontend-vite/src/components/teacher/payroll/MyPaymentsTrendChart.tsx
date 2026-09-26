import { formatCurrencyAmount } from "@/lib/format/currency";
import type { MyTeacherPaymentMonthlyPoint } from "@/server/payroll/types";

const CHART_HEIGHT = 96;

/** "2026-04" -> "Abr" (mes corto en español, sin punto final ni año -- el año se añade aparte solo
 * cuando la ventana cruza de año, ver buildLabel). */
function shortMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y as number, (m as number) - 1, 1));
  const raw = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(d).replace(/\.$/, "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Barra + etiqueta compacta hecho con flexbox (reemplaza el SVG de ancho fijo anterior, que quedaba
 * angosto/desalineado dentro de un Card mucho más ancho y amontonaba las etiquetas "mes año"
 * completas). El valor real de cada punto sigue viniendo tal cual de getMyTeacherPaymentsMonthlyTrend
 * (SUM(teacher_payments.total_amount) agrupado por paid_at) -- este componente solo presenta.
 */
export function MyPaymentsTrendChart({ points }: { points: MyTeacherPaymentMonthlyPoint[] }) {
  const maxValue = Math.max(1, ...points.map((p) => p.totalAmount));
  const showEveryOtherLabelOnMobile = points.length > 8;

  return (
    <div style={{ width: "100%" }}>
      <div
        role="img"
        aria-label="Gráfico de barras: pagos recibidos por mes"
        style={{ display: "flex", alignItems: "flex-end", gap: 4, height: CHART_HEIGHT, borderBottom: "1px solid var(--border-subtle)" }}
      >
        {points.map((point) => {
          const barHeight = Math.round((point.totalAmount / maxValue) * (CHART_HEIGHT - 4));
          return (
            <div key={point.monthKey} style={{ flex: "1 1 0", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <div
                title={`${point.monthLabel}: ${formatCurrencyAmount(point.totalAmount, "PEN")}`}
                style={{
                  width: "60%",
                  maxWidth: 36,
                  minWidth: 6,
                  height: Math.max(barHeight, point.totalAmount > 0 ? 3 : 0),
                  background: "var(--cyan-600)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {points.map((point, index) => {
          const previousYear = index > 0 ? points[index - 1]!.monthKey.slice(0, 4) : null;
          const year = point.monthKey.slice(0, 4);
          const showYear = index === 0 || year !== previousYear;
          const hideOnMobile = showEveryOtherLabelOnMobile && index % 2 === 1;
          return (
            <div
              key={point.monthKey}
              className={hideOnMobile ? "xp-trend-label-optional" : undefined}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                textAlign: "center",
                font: "var(--weight-medium) 11px/1.3 var(--font-body)",
                color: "var(--text-muted)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {shortMonthLabel(point.monthKey)}
              {showYear && <span style={{ display: "block", fontSize: 10 }}>{year}</span>}
            </div>
          );
        })}
      </div>

      {showEveryOtherLabelOnMobile && (
        <style>{"@media (max-width: 480px) { .xp-trend-label-optional { display: none; } }"}</style>
      )}
    </div>
  );
}
