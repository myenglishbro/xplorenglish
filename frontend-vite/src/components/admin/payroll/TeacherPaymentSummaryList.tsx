import { Link } from "react-router-dom";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { TeacherPaymentSummaryItem } from "@/server/payroll/types";

/**
 * Listado principal Admin -> Pagos a profesores (Slice E). Reemplaza por completo la tabla vieja
 * de periodos + el resumen de deuda separado -- ahora es una sola fuente (class_records) y una
 * sola lista, una fila por profesor.
 */
export function TeacherPaymentSummaryList({ items }: { items: TeacherPaymentSummaryItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="credit-card" title="Todavía no hay profesores">
        Cuando haya profesores activos, aparecerán acá con sus clases pendientes de pago.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {items.map((t) => (
        <Card key={t.teacherId} pad>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
            <div>
              <div style={{ font: "var(--weight-bold) var(--text-body-size)/1.3 var(--font-display)", color: "var(--text-heading)" }}>{t.teacherName}</div>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "var(--space-4)", font: "var(--weight-regular) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
                <span>
                  {t.pendingClassCount} clase{t.pendingClassCount === 1 ? "" : "s"} pendiente{t.pendingClassCount === 1 ? "" : "s"}
                </span>
                <span>{formatMinutesAsHours(t.pendingMinutes)}</span>
                <span>{t.lastClassAt ? `Última clase: ${formatShortDateInLima(t.lastClassAt)}` : "Sin clases registradas"}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div
                style={{
                  font: "var(--weight-extrabold) 20px/1 var(--font-display)",
                  color: t.pendingAmount > 0 ? "var(--text-heading)" : "var(--text-muted)",
                }}
              >
                {formatCurrencyAmount(t.pendingAmount, "PEN")}
              </div>
              <Link to={`/admin/pagos-docentes/${t.teacherId}`}>
                <Button variant="secondary" size="sm">
                  Ver detalle
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
