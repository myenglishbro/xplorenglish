"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { SessionStatusTag } from "@/components/scheduling/SessionStatusTag";
import { TeacherAssignment } from "@/components/scheduling/TeacherAssignment";
import { RescheduleSessionButton } from "@/components/scheduling/RescheduleSessionButton";
import { StartSessionButton } from "./StartSessionButton";
import { CompleteSessionButton } from "./CompleteSessionButton";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { SessionListItem } from "@/server/scheduling/types";

export interface TeacherSessionsTableProps {
  sessions: SessionListItem[];
  teacherOptions: { id: string; name: string }[];
  /** Próximas: puede iniciar/finalizar/reprogramar. Pasadas: solo lectura. */
  showActions: boolean;
}

export function TeacherSessionsTable({ sessions, teacherOptions, showActions }: TeacherSessionsTableProps) {
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
    ...(showActions
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (row: SessionListItem) =>
              row.status === "scheduled" ? (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                  {row.actualStart ? <CompleteSessionButton sessionId={row.id} /> : <StartSessionButton sessionId={row.id} />}
                  <RescheduleSessionButton
                    sessionId={row.id}
                    classroomId={row.classroomId}
                    scheduledStart={row.scheduledStart}
                    scheduledEnd={row.scheduledEnd}
                    teacherOptions={teacherOptions}
                    triggerVariant="ghost"
                  />
                </div>
              ) : null,
          },
        ]
      : []),
  ];

  return <DataTable columns={columns} rows={sessions} dense />;
}
