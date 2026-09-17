"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { StudentAttendanceHistoryItem } from "@/server/hours/types";

const STATUS_LABEL: Record<StudentAttendanceHistoryItem["status"], string> = {
  present: "Presente",
  absent: "Ausente",
  rescheduled: "Reprogramada",
};

/** 100% solo lectura, fuente class_records (Slice A/F) -- cada fila ya nace con status/minutos
 * definitivos, sin el estado transitorio "pendiente" del modelo viejo. */
export function AttendanceHistoryTable({ items }: { items: StudentAttendanceHistoryItem[] }) {
  const columns: DataTableColumn<StudentAttendanceHistoryItem>[] = [
    { key: "date", header: "Fecha", render: (row) => formatShortDateInLima(row.occurredAt) },
    { key: "time", header: "Hora", render: (row) => formatTimeInLima(row.occurredAt) },
    {
      key: "classroomName",
      header: "Salón",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.classroomName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Asistencia",
      render: (row) => (
        <Tag tone={row.status === "present" ? "success" : row.status === "absent" ? "warning" : "neutral"} size="sm">
          {STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
    { key: "minutes", header: "Minutos cobrados", align: "right", render: (row) => (row.minutes > 0 ? formatMinutesAsHours(row.minutes) : "—") },
  ];

  return <DataTable columns={columns} rows={items} dense />;
}
