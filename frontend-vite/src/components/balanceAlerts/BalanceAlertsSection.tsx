import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Tag } from "@/components/ui/core/Tag";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import type { StudentBalanceAlertItem } from "@/server/balanceAlerts/types";

export interface BalanceAlertsSectionProps {
  items: StudentBalanceAlertItem[];
  emptyTitle: string;
  emptyDescription: string;
  /** Navegación por fila (ej. "Ver salón" o "Ver estudiante") -- distinta entre Admin y Teacher, por
   * eso se recibe como render prop en vez de asumir una ruta fija acá. */
  renderAction: (item: StudentBalanceAlertItem) => React.ReactNode;
}

/**
 * Tabla compartida Admin/Teacher de "estudiantes con saldo bajo o sin saldo" (Slice G) --
 * get_student_balance_alerts() ya filtra a esos dos estados y ordena por saldo ascendente (SIN
 * SALDO antes que SALDO BAJO), esta sección solo presenta. Nunca recalcula el estado del saldo:
 * usa el helper central getStudentBalanceStatus.
 */
export function BalanceAlertsSection({ items, emptyTitle, emptyDescription, renderAction }: BalanceAlertsSectionProps) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="check-circle" title={emptyTitle}>
          {emptyDescription}
        </EmptyState>
      </Card>
    );
  }

  const columns: DataTableColumn<StudentBalanceAlertItem>[] = [
    { key: "studentName", header: "Estudiante" },
    { key: "balance", header: "Saldo", align: "right", render: (row) => `${row.balance} min` },
    {
      key: "status",
      header: "Estado",
      render: (row) => {
        const balanceStatus = getStudentBalanceStatus(row.balance);
        return <Tag tone={balanceStatus.tone}>{balanceStatus.label}</Tag>;
      },
    },
    { key: "classroomName", header: "Salón", render: (row) => row.classroomName ?? "—" },
    { key: "action", header: "", align: "right", render: renderAction },
  ];

  return (
    <Card pad={false}>
      <DataTable columns={columns} rows={items} dense />
    </Card>
  );
}
