"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { SessionStatusTag } from "@/components/scheduling/SessionStatusTag";
import { TeacherAssignment } from "@/components/scheduling/TeacherAssignment";
import { RescheduleSessionButton } from "@/components/scheduling/RescheduleSessionButton";
import { ReassignTeacherButton } from "./ReassignTeacherButton";
import { CancelSessionButton } from "./CancelSessionButton";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { SessionListItem } from "@/server/scheduling/types";

export interface SessionsWeekTableProps {
  sessions: SessionListItem[];
  teacherOptions: { id: string; name: string }[];
}

export function SessionsWeekTable({ sessions, teacherOptions }: SessionsWeekTableProps) {
  const router = useRouter();

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
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        row.status === "scheduled" ? (
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
            <ReassignTeacherButton sessionId={row.id} teacherOptions={teacherOptions} />
            <RescheduleSessionButton
              sessionId={row.id}
              classroomId={row.classroomId}
              scheduledStart={row.scheduledStart}
              scheduledEnd={row.scheduledEnd}
              teacherOptions={teacherOptions}
            />
            <CancelSessionButton sessionId={row.id} />
          </div>
        ) : null,
    },
  ];

  return <DataTable columns={columns} rows={sessions} dense onRowClick={(row) => router.push(`/admin/calendario/${row.id}`)} />;
}
