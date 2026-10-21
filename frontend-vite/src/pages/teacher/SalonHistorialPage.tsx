import { Link, useParams } from "react-router-dom";
import { useMyClassroomHistory, useMyClassroomHistoryRecords } from "@/features/classrooms/hooks";
import type { ClassroomHistoryRecord } from "@/server/teacher/classrooms/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { ClassRecordStatus } from "@/features/classRecords/types";

const STATUS_LABEL: Record<ClassRecordStatus, string> = { present: "Presente", absent: "Ausente", rescheduled: "Reprogramada" };
const STATUS_TONE: Record<ClassRecordStatus, TagTone> = { present: "success", absent: "warning", rescheduled: "neutral" };

/** Detalle de solo lectura de un salón dictado (finalizado o no): resumen de lo trabajado y
 * cobrado + las clases que ESTE docente dictó. No muestra acciones de registro ni corrección. */
export function TeacherSalonHistorialPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const historyQuery = useMyClassroomHistory();
  const recordsQuery = useMyClassroomHistoryRecords(classroomId);

  const summary = historyQuery.data?.find((i) => i.classroomId === classroomId);

  if (historyQuery.isLoading || recordsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }
  if (historyQuery.isError || recordsQuery.isError) return <Alert tone="danger">No pudimos cargar este salón. Recarga la página.</Alert>;
  if (!summary) {
    return (
      <EmptyState icon="warning" title="No encontramos este salón en tu historial">
        Solo aparecen los salones donde dictaste clases.
      </EmptyState>
    );
  }

  const records = recordsQuery.data ?? [];

  const columns: DataTableColumn<ClassroomHistoryRecord>[] = [
    {
      key: "occurredAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.occurredAt)} · {formatTimeInLima(row.occurredAt)}
        </span>
      ),
    },
    { key: "status", header: "Estado", render: (row) => <Tag tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Tag> },
    { key: "minutes", header: "Duración", render: (row) => (row.minutes > 0 ? formatMinutesAsHours(row.minutes) : "—") },
    { key: "amount", header: "Importe", align: "right", render: (row) => (row.amount !== null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
    {
      key: "paid",
      header: "Pago",
      render: (row) => {
        if (row.amount === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
        return row.paid ? (
          <Tag tone="success" size="sm" icon="check-circle">
            Pagado{row.paidAt ? ` · ${formatShortDateInLima(row.paidAt)}` : ""}
          </Tag>
        ) : (
          <Tag tone="warning" size="sm" icon="clock">
            Pendiente
          </Tag>
        );
      },
    },
    { key: "notes", header: "Notas", render: (row) => row.notes ?? <span style={{ color: "var(--text-muted)" }}>—</span> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/teacher/salones?tab=historial"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver al historial
        </Link>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {summary.classroomName}
          </h1>
          <Tag tone="accent">{summary.level}</Tag>
          {summary.classroomStatus !== "active" && <Tag tone="neutral">Finalizado</Tag>}
        </div>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
          {summary.programName}
          {summary.studentName ? ` · ${summary.studentName}` : ""}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Clases dictadas" value={summary.classesCount} icon="chalkboard-teacher" tone="accent" />
        <StatCard label="Horas trabajadas" value={formatMinutesAsHours(summary.totalMinutes)} icon="clock" tone="accent" />
        <StatCard label="Total pagado" value={formatCurrencyAmount(summary.paidAmount, "PEN")} icon="hand-coins" tone="accent" />
        <StatCard label="Pendiente de pago" value={formatCurrencyAmount(summary.pendingAmount, "PEN")} icon="hourglass" tone="accent" />
      </div>

      <Card>
        {records.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Sin clases">
            No hay clases registradas por ti en este salón.
          </EmptyState>
        ) : (
          <DataTable columns={columns} rows={records} />
        )}
      </Card>
    </div>
  );
}
