import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { Tag } from "@/components/ui/core/Tag";
import { TwoLineCell } from "@/components/admin/TwoLineCell";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { TeacherPaymentStatementRow } from "@/server/payroll/types";

interface ClassroomSummary {
  [key: string]: unknown;
  key: string;
  classroomName: string;
  studentName: string;
  classes: number;
  minutes: number;
  paidAmount: number;
  pendingAmount: number;
  lastClassAt: string;
}

/** Agrupa el estado de cuenta por salón. Solo cuentan clases remunerables (PRESENTE/AUSENTE):
 * las reprogramadas no tienen monto. Se agrupa por salón + alumno porque el nombre del salón no
 * es único. */
function summarizeByClassroom(rows: TeacherPaymentStatementRow[]): ClassroomSummary[] {
  const byKey = new Map<string, ClassroomSummary>();
  for (const row of rows) {
    if (row.financialStatus === "not_applicable") continue;
    const key = `${row.classroomName}|${row.studentId ?? ""}`;
    const entry =
      byKey.get(key) ??
      ({ key, classroomName: row.classroomName, studentName: row.studentName, classes: 0, minutes: 0, paidAmount: 0, pendingAmount: 0, lastClassAt: row.occurredAt } satisfies ClassroomSummary);
    entry.classes += 1;
    entry.minutes += row.minutes;
    const amount = row.amount ?? 0;
    if (row.financialStatus === "paid") entry.paidAmount += amount;
    else entry.pendingAmount += amount;
    if (row.occurredAt > entry.lastClassAt) entry.lastClassAt = row.occurredAt;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.lastClassAt.localeCompare(a.lastClassAt));
}

/**
 * Estado financiero del docente: totales pagado/pendiente y desglose por salón (activos y
 * finalizados) -- la misma información que Administración ve en su estado de cuenta, de solo
 * lectura. Se calcula sobre las filas ya cargadas (class_records propios), nunca sobre otra fuente.
 */
export function MyClassroomsFinancialSummary({ rows }: { rows: TeacherPaymentStatementRow[] }) {
  const summaries = summarizeByClassroom(rows);
  if (summaries.length === 0) return null;

  const totals = summaries.reduce(
    (acc, s) => ({ paid: acc.paid + s.paidAmount, pending: acc.pending + s.pendingAmount, classes: acc.classes + s.classes }),
    { paid: 0, pending: 0, classes: 0 },
  );

  const columns: DataTableColumn<ClassroomSummary>[] = [
    {
      key: "classroomName",
      header: "Salón",
      render: (row) => <TwoLineCell strong primary={row.classroomName} secondary={row.studentName} />,
    },
    {
      key: "classes",
      header: "Clases",
      render: (row) => <TwoLineCell primary={`${row.classes} clases`} secondary={formatMinutesAsHours(row.minutes)} />,
    },
    { key: "lastClassAt", header: "Última clase", render: (row) => formatShortDateInLima(row.lastClassAt) },
    { key: "paidAmount", header: "Pagado", align: "right", render: (row) => formatCurrencyAmount(row.paidAmount, "PEN") },
    { key: "pendingAmount", header: "Pendiente", align: "right", render: (row) => formatCurrencyAmount(row.pendingAmount, "PEN") },
    {
      key: "state",
      header: "Estado",
      render: (row) =>
        row.pendingAmount > 0 ? (
          <Tag tone="warning" size="sm" icon="clock">
            Pendiente
          </Tag>
        ) : (
          <Tag tone="success" size="sm" icon="check-circle">
            Al día
          </Tag>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Estado financiero por salón
        </h2>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Incluye todos tus salones, también los ya finalizados.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Total pagado" value={formatCurrencyAmount(totals.paid, "PEN")} icon="check-circle" tone="accent" />
        <StatCard label="Pendiente de pago" value={formatCurrencyAmount(totals.pending, "PEN")} icon="hourglass" tone="brand" />
        <StatCard label="Clases remuneradas" value={totals.classes} icon="chalkboard-teacher" tone="accent" />
      </div>
      <Card pad={false}>
        <DataTable columns={columns} rows={summaries} dense />
      </Card>
    </div>
  );
}
