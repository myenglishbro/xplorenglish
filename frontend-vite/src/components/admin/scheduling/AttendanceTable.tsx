import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { AttendanceBillingButton } from "./AttendanceBillingButton";
import { ATTENDANCE_STATUS_LABELS, type AttendanceRosterItem } from "@/server/scheduling/types";

export type AttendanceTableVariant = "pending" | "rescheduled" | "billing";

export interface AttendanceTableProps {
  variant: AttendanceTableVariant;
  sessionId: number;
  roster: AttendanceRosterItem[];
  /** Solo se usa en variant="billing" (ver suggestedMinutesFrom en AttendanceSection). */
  suggestedMinutes?: number;
}

export function AttendanceTable({ variant, sessionId, roster, suggestedMinutes = 0 }: AttendanceTableProps) {
  if (variant === "pending") {
    const columns: DataTableColumn<AttendanceRosterItem>[] = [
      { key: "studentName", header: "Estudiante" },
      {
        key: "status",
        header: "Estado",
        render: () => (
          <Tag tone="neutral" size="sm">
            Pendiente
          </Tag>
        ),
      },
    ];
    return <DataTable columns={columns} rows={roster} dense />;
  }

  if (variant === "rescheduled") {
    const columns: DataTableColumn<AttendanceRosterItem>[] = [
      { key: "studentName", header: "Estudiante" },
      {
        key: "status",
        header: "Estado",
        render: (row) => (
          <Tag tone="warning" size="sm">
            {ATTENDANCE_STATUS_LABELS[row.status]}
          </Tag>
        ),
      },
    ];
    return <DataTable columns={columns} rows={roster} dense />;
  }

  // variant === "billing"
  const billingColumns: DataTableColumn<AttendanceRosterItem>[] = [
    { key: "studentName", header: "Estudiante" },
    {
      key: "status",
      header: "Estado",
      render: (row) =>
        row.minutesCharged === null ? (
          <Tag tone="neutral" size="sm">
            Pendiente de facturación
          </Tag>
        ) : (
          <Tag tone={row.status === "present" ? "success" : row.status === "absent" ? "warning" : "danger"} size="sm">
            {ATTENDANCE_STATUS_LABELS[row.status]}
          </Tag>
        ),
    },
    {
      key: "minutesCharged",
      header: "Minutos",
      align: "center",
      render: (row) => (row.minutesCharged === null ? "—" : row.minutesCharged),
    },
    {
      key: "decided",
      header: "Decidido por",
      render: (row) => (row.decidedByName ? row.decidedByName : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <AttendanceBillingButton
          sessionId={sessionId}
          studentId={row.studentId}
          studentName={row.studentName}
          currentStatus={row.status}
          currentMinutesCharged={row.minutesCharged}
          suggestedMinutes={suggestedMinutes}
        />
      ),
    },
  ];

  return <DataTable columns={billingColumns} rows={roster} dense />;
}
