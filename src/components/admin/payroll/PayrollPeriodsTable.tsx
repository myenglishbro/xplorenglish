"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { PAYROLL_STATUS_LABEL, PAYROLL_STATUS_TONE, type PayrollPeriodListItem } from "@/server/payroll/types";

/** period_start/period_end son `date` puro ("YYYY-MM-DD"), sin hora ni zona -- formatear con
 * split simple, nunca con new Date()/timeZone (correría el día un día para atrás en Lima,
 * UTC-5, si se tratara como un instante). */
function formatDateOnly(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export interface PayrollPeriodsTableProps {
  items: PayrollPeriodListItem[];
  /** Reutilizada tal cual por /teacher/pagos (misma tabla, misma forma de datos vía RLS) --
   * solo cambia a dónde navega el click de fila y si tiene sentido mostrar "Docente" (el propio
   * docente viendo sus periodos no necesita ver su propio nombre repetido en cada fila). */
  basePath?: string;
  showTeacherColumn?: boolean;
}

export function PayrollPeriodsTable({ items, basePath = "/admin/pagos-docentes", showTeacherColumn = true }: PayrollPeriodsTableProps) {
  const router = useRouter();

  const columns: DataTableColumn<PayrollPeriodListItem>[] = [
    ...(showTeacherColumn
      ? [
          {
            key: "teacherName",
            header: "Docente",
            render: (row: PayrollPeriodListItem) => (
              <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                {row.teacherName}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "period",
      header: "Periodo",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatDateOnly(row.periodStart)} – {formatDateOnly(row.periodEnd)}
        </span>
      ),
    },
    { key: "totalMinutes", header: "Horas", render: (row) => formatMinutesAsHours(row.totalMinutes) },
    { key: "totalAmount", header: "Monto", align: "right", render: (row) => formatCurrencyAmount(row.totalAmount, "PEN") },
    {
      key: "status",
      header: "Estado",
      render: (row) => <Tag tone={PAYROLL_STATUS_TONE[row.status]}>{PAYROLL_STATUS_LABEL[row.status]}</Tag>,
    },
    {
      key: "hasReceipt",
      header: "Recibo",
      render: (row) => (row.hasReceipt ? <Tag tone="success" size="sm">Sí</Tag> : <Tag tone="neutral" size="sm">Pendiente</Tag>),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" />,
    },
  ];

  return <DataTable columns={columns} rows={items} onRowClick={(row) => router.push(`${basePath}/${row.id}`)} />;
}
