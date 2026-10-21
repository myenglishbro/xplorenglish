import { useNavigate } from "react-router-dom";
import { useMyClassroomHistory } from "@/features/classrooms/hooks";
import type { ClassroomHistoryItem } from "@/server/teacher/classrooms/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { TwoLineCell } from "@/components/admin/TwoLineCell";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";

/** Un salón entra al historial cuando está finalizado (archivado) o cuando el docente ya no está
 * asignado: en ambos casos ya no aparece en "Activos" pero sus clases siguen siendo trabajo
 * dictado y pagado/por pagar. */
export function isClosedForTeacher(item: ClassroomHistoryItem): boolean {
  return item.classroomStatus !== "active" || !item.isActiveMember;
}

/** Pestaña "Historial" de Mis salones: todo lo que el docente dictó en salones ya cerrados, con lo
 * generado y lo pagado. Solo lectura -- el detalle de cada salón es otra página. */
export function ClassroomHistoryList() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMyClassroomHistory();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
        <Spinner size={24} label="Cargando historial…" />
      </div>
    );
  }
  if (isError || !data) return <Alert tone="danger">No pudimos cargar tu historial. Recarga la página.</Alert>;

  const items = data.filter(isClosedForTeacher);

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="clock-counter-clockwise" title="Aún no tienes salones finalizados">
          Cuando un salón en el que dictaste clases termine, aparecerá aquí con todo lo que trabajaste y cobraste.
        </EmptyState>
      </Card>
    );
  }

  const totals = items.reduce(
    (acc, i) => ({ classes: acc.classes + i.classesCount, minutes: acc.minutes + i.totalMinutes, amount: acc.amount + i.totalAmount }),
    { classes: 0, minutes: 0, amount: 0 },
  );

  const columns: DataTableColumn<ClassroomHistoryItem>[] = [
    {
      key: "classroomName",
      header: "Salón",
      render: (row) => <TwoLineCell strong primary={row.classroomName} secondary={`${row.programName} · ${row.level}`} />,
    },
    {
      key: "studentName",
      header: "Estudiante",
      render: (row) => row.studentName ?? <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    {
      key: "period",
      header: "Periodo",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap", color: "var(--text-body)" }}>
          {formatShortDateInLima(row.firstClassAt)} – {formatShortDateInLima(row.lastClassAt)}
        </span>
      ),
    },
    {
      key: "classesCount",
      header: "Clases",
      render: (row) => <TwoLineCell primary={`${row.classesCount} clases`} secondary={formatMinutesAsHours(row.totalMinutes)} />,
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      render: (row) => <strong>{formatCurrencyAmount(row.totalAmount, "PEN")}</strong>,
    },
    {
      key: "payment",
      header: "Pago",
      render: (row) =>
        row.pendingAmount > 0 ? (
          <Tag tone="warning" size="sm" icon="clock">
            Pendiente {formatCurrencyAmount(row.pendingAmount, "PEN")}
          </Tag>
        ) : (
          <Tag tone="success" size="sm" icon="check-circle">
            Pagado
          </Tag>
        ),
    },
    {
      key: "state",
      header: "",
      render: (row) => (
        <Tag tone="neutral" size="sm">
          {row.classroomStatus !== "active" ? "Finalizado" : "Ya no asignado"}
        </Tag>
      ),
    },
    { key: "action", header: "", align: "right", render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Salones dictados" value={items.length} icon="chalkboard" tone="accent" />
        <StatCard label="Clases dictadas" value={totals.classes} icon="chalkboard-teacher" tone="accent" />
        <StatCard label="Horas trabajadas" value={formatMinutesAsHours(totals.minutes)} icon="clock" tone="accent" />
        <StatCard label="Total generado" value={formatCurrencyAmount(totals.amount, "PEN")} icon="hand-coins" tone="accent" />
      </div>
      <Card>
        <DataTable columns={columns} rows={items} onRowClick={(row) => navigate(`/teacher/salones/historial/${row.classroomId}`)} />
      </Card>
    </div>
  );
}
