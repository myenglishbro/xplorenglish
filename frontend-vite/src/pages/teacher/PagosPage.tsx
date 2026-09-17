import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tag } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { useMyPaymentStatement } from "@/features/payroll/hooks";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_STATUS_TONE, type TeacherPaymentStatementRow } from "@/server/payroll/types";

interface Row extends TeacherPaymentStatementRow {
  [key: string]: unknown;
}

/**
 * "Mis pagos" (Teacher) -- fix post-Slice F. Lectura mínima de solo lectura sobre class_records +
 * teacher_payments (misma fuente que Admin, Slice E). Sin selección/pago: eso es exclusivo de
 * Admin (Pagos a profesores). No es un módulo nuevo, solo la versión de solo lectura del mismo dato.
 */
export function TeacherPagosPage() {
  const { data: rows, isLoading, isError } = useMyPaymentStatement();

  const columns: DataTableColumn<Row>[] = [
    {
      key: "occurredAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.occurredAt)} · {formatTimeInLima(row.occurredAt)}
        </span>
      ),
    },
    { key: "classroomName", header: "Salón" },
    { key: "minutes", header: "Minutos", align: "right", render: (row) => (row.minutes > 0 ? formatMinutesAsHours(row.minutes) : "—") },
    { key: "amount", header: "Monto", align: "right", render: (row) => (row.amount != null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
    {
      key: "financialStatus",
      header: "Estado",
      render: (row) => <Tag tone={FINANCIAL_STATUS_TONE[row.financialStatus]}>{FINANCIAL_STATUS_LABEL[row.financialStatus]}</Tag>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Mis pagos
      </h1>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando…" />
        </div>
      ) : isError || !rows ? (
        <Alert tone="danger">No pudimos cargar tus pagos. Recarga la página.</Alert>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon="credit-card" title="Todavía no tienes clases remunerables">
            Cuando registres una clase PRESENTE o AUSENTE, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <Card pad={false}>
          <DataTable columns={columns} rows={rows} dense />
        </Card>
      )}
    </div>
  );
}
