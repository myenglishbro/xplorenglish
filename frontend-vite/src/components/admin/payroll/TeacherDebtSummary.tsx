"use client";

import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { useTeacherDebtSummary } from "@/features/payrollAdmin/hooks";
import { CreatePayrollPeriodButton } from "./CreatePayrollPeriodButton";
import type { TeacherDebtSummaryItem } from "@/server/payroll/types";

/** lastClassAt es un instante real (sessions.actual_end/actual_start, timestamptz) -- se formatea
 * en hora de pared Lima, nunca con un split de string como las fechas puras (period_start/end). */
function formatDateInLima(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export interface TeacherDebtSummaryProps {
  teachers: { id: string; firstName: string; lastName: string }[];
}

/**
 * "¿Cuánto debo?" -- sin filtros, visible de inmediato al entrar a Pagos docentes. Fuente de
 * verdad: teacher_hours_log.amount (ver listTeacherDebtSummary). Nunca recalcula horas × tarifa
 * actual; nunca decide un mecanismo de pago propio -- "Crear periodo" reutiliza tal cual
 * CreatePayrollPeriodButton, el mismo flujo de siempre.
 */
export function TeacherDebtSummary({ teachers }: TeacherDebtSummaryProps) {
  const summaryQuery = useTeacherDebtSummary();

  if (summaryQuery.isLoading) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Calculando deuda a profesores…" />
        </div>
      </Card>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return <Alert tone="danger">No pudimos calcular la deuda a profesores. Recarga la página para intentarlo de nuevo.</Alert>;
  }

  const items = summaryQuery.data;
  // Suma directa de pendingAmount (ya en centavos exactos por docente, ver listTeacherDebtSummary)
  // -- equivalente a SUM(generado) - SUM(pagado) global, nunca un segundo cálculo divergente.
  const totalPending = items.reduce((sum, i) => sum + i.pendingAmount, 0);

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <StatCard label="TOTAL POR PAGAR" value={formatCurrencyAmount(0, "PEN")} icon="money" tone="brand" />
        <EmptyState icon="chalkboard-teacher" title="Todavía no hay horas dictadas">
          Cuando se completen sesiones, el costo docente generado aparecerá acá automáticamente.
        </EmptyState>
      </div>
    );
  }

  const columns: DataTableColumn<TeacherDebtSummaryItem>[] = [
    {
      key: "teacherName",
      header: "Profesor",
      render: (row) => <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{row.teacherName}</span>,
    },
    { key: "generatedAmount", header: "Generado acumulado", align: "right", render: (row) => formatCurrencyAmount(row.generatedAmount, "PEN") },
    { key: "paidAmount", header: "Pagado", align: "right", render: (row) => formatCurrencyAmount(row.paidAmount, "PEN") },
    {
      key: "pendingAmount",
      header: "Pendiente",
      align: "right",
      render: (row) => (
        <span style={{ font: "var(--weight-bold) var(--text-body-sm-size)/1.3 var(--font-body)", color: row.pendingAmount > 0 ? "var(--danger-fg)" : "var(--text-body)" }}>
          {formatCurrencyAmount(row.pendingAmount, "PEN")}
        </span>
      ),
    },
    { key: "lastClassAt", header: "Última clase", render: (row) => (row.lastClassAt ? formatDateInLima(row.lastClassAt) : "—") },
    {
      key: "action",
      header: "Acción",
      align: "right",
      render: (row) =>
        row.pendingAmount > 0 ? (
          <CreatePayrollPeriodButton teachers={teachers} defaultTeacherId={row.teacherId} triggerLabel="Crear periodo" triggerVariant="ghost" triggerSize="sm" />
        ) : (
          <span style={{ color: "var(--text-subtle)" }}>—</span>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <StatCard label="TOTAL POR PAGAR" value={formatCurrencyAmount(totalPending, "PEN")} icon="money" tone="brand" />
      <Card
        pad={false}
        footer={
          <div style={{ textAlign: "right", font: "var(--weight-bold) var(--text-body-size)/1 var(--font-display)", color: "var(--text-heading)" }}>
            TOTAL PENDIENTE: {formatCurrencyAmount(totalPending, "PEN")}
          </div>
        }
      >
        <DataTable columns={columns} rows={items} />
      </Card>
    </div>
  );
}
