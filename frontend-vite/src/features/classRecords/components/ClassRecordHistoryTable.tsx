import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { CorrectClassButton } from "./CorrectClassButton";
import type { ClassRecordHistoryItem, ClassRecordStatus } from "@/features/classRecords/types";

const STATUS_LABEL: Record<ClassRecordStatus, string> = {
  present: "Presente",
  absent: "Ausente",
  rescheduled: "Reprogramada",
};

const STATUS_TONE: Record<ClassRecordStatus, TagTone> = {
  present: "success",
  absent: "warning",
  rescheduled: "neutral",
};

// DataTable requiere Record<string, unknown> -- ver criterio en server/*/types.ts.
interface HistoryRow extends ClassRecordHistoryItem {
  [key: string]: unknown;
}

export interface ClassRecordHistoryTableProps {
  classroomId: number;
  items: ClassRecordHistoryItem[];
  /** Si se pasa, las filas donde teacherId coincide muestran el botón "Corregir" (Slice F). */
  currentTeacherId?: string;
  /** Admin ve tarifa/monto; Teacher/Student ven solo lo académico (Slice F, punto 13). */
  showFinancials?: boolean;
}

/**
 * Historial de un salón (Slice F) -- fuente única class_records, más reciente arriba. El nombre
 * del profesor viene de la propia fila (snapshot histórico), nunca de classroom_teachers actual.
 */
export function ClassRecordHistoryTable({ classroomId, items, currentTeacherId, showFinancials }: ClassRecordHistoryTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="clock-counter-clockwise" title="Sin clases registradas todavía">
        Cuando se registre la primera clase, aparecerá acá.
      </EmptyState>
    );
  }

  const columns: DataTableColumn<HistoryRow>[] = [
    {
      key: "occurredAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.occurredAt)} · {formatTimeInLima(row.occurredAt)}
        </span>
      ),
    },
    { key: "teacherName", header: "Profesor" },
    { key: "status", header: "Estado", render: (row) => <Tag tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Tag> },
    { key: "minutes", header: "Minutos", align: "right", render: (row) => (row.minutes > 0 ? row.minutes : "—") },
    { key: "notes", header: "Observación", render: (row) => row.notes ?? "—" },
    ...(showFinancials
      ? ([
          {
            key: "hourlyRateSnapshot",
            header: "Tarifa",
            align: "right",
            render: (row) => (row.hourlyRateSnapshot != null ? `${formatCurrencyAmount(row.hourlyRateSnapshot, "PEN")}/h` : "—"),
          },
          { key: "amount", header: "Monto", align: "right", render: (row) => (row.amount != null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
        ] satisfies DataTableColumn<HistoryRow>[])
      : []),
    ...(currentTeacherId
      ? ([
          {
            key: "actions",
            header: "",
            align: "right",
            render: (row) => (row.teacherId === currentTeacherId ? <CorrectClassButton classroomId={classroomId} record={row} /> : null),
          },
        ] satisfies DataTableColumn<HistoryRow>[])
      : []),
  ];

  return (
    <Card pad={false}>
      <DataTable columns={columns} rows={items} dense />
    </Card>
  );
}
