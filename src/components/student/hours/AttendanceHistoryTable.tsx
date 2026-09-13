"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { ATTENDANCE_STATUS_LABELS } from "@/server/scheduling/types";
import type { StudentAttendanceHistoryItem } from "@/server/hours/types";

/**
 * 100% solo lectura. minutesCharged === null se muestra SIEMPRE como "Pendiente" -- nunca el
 * status crudo (que por defecto es 'present' desde initialize_session_attendance y no representa
 * una decisión real todavía) -- mismo principio exacto que AttendanceSection (admin).
 */
export function AttendanceHistoryTable({ items }: { items: StudentAttendanceHistoryItem[] }) {
  const columns: DataTableColumn<StudentAttendanceHistoryItem>[] = [
    { key: "date", header: "Fecha", render: (row) => formatShortDateInLima(row.scheduledStart) },
    {
      key: "time",
      header: "Hora",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatTimeInLima(row.scheduledStart)}–{formatTimeInLima(row.scheduledEnd)}
        </span>
      ),
    },
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
      render: (row) =>
        row.minutesCharged === null ? (
          <Tag tone="neutral" size="sm">
            Pendiente
          </Tag>
        ) : (
          <Tag tone={row.status === "present" ? "success" : row.status === "absent" ? "warning" : "danger"} size="sm">
            {ATTENDANCE_STATUS_LABELS[row.status]}
          </Tag>
        ),
    },
    {
      key: "minutesCharged",
      header: "Minutos cobrados",
      align: "right",
      render: (row) => (row.minutesCharged === null ? "—" : formatMinutesAsHours(row.minutesCharged)),
    },
  ];

  return <DataTable columns={columns} rows={items} dense />;
}
