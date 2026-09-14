"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { SessionStatusTag } from "@/components/scheduling/SessionStatusTag";
import { TeacherAssignment } from "@/components/scheduling/TeacherAssignment";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { SessionListItem } from "@/server/scheduling/types";

/** 100% de solo lectura -- sin ninguna acción ni Server Action, a propósito (mismo criterio que
 * CourseViewer para contenido académico). */
export function StudentSessionsTable({ sessions }: { sessions: SessionListItem[] }) {
  const columns: DataTableColumn<SessionListItem>[] = [
    {
      key: "when",
      header: "Fecha y hora",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.scheduledStart)} · {formatTimeInLima(row.scheduledStart)}–{formatTimeInLima(row.scheduledEnd)}
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
      key: "teacher",
      header: "Docente",
      render: (row) => (
        <TeacherAssignment
          scheduledTeacherId={row.scheduledTeacherId}
          scheduledTeacherName={row.scheduledTeacherName}
          actualTeacherId={row.actualTeacherId}
          actualTeacherName={row.actualTeacherName}
        />
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => <SessionStatusTag status={row.status} size="sm" />,
    },
  ];

  return <DataTable columns={columns} rows={sessions} dense />;
}
