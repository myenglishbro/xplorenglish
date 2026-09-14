import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { PaymentListItem, PaymentStatus } from "@/server/payments/types";
import type { PackageStatus } from "@/server/hours/types";

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  completed: "Completado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, TagTone> = {
  pending: "warning",
  completed: "success",
  failed: "danger",
  refunded: "neutral",
};

const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  active: "Activo",
  exhausted: "Agotado",
  expired: "Vencido",
};

const PACKAGE_STATUS_TONE: Record<PackageStatus, TagTone> = {
  active: "success",
  exhausted: "neutral",
  expired: "danger",
};

export function PaymentsTable({ payments }: { payments: PaymentListItem[] }) {
  const navigate = useNavigate();

  const columns: DataTableColumn<PaymentListItem>[] = [
    {
      key: "studentName",
      header: "Estudiante",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.studentName}
        </span>
      ),
    },
    { key: "amount", header: "Monto", render: (row) => formatCurrencyAmount(row.amount, row.currency) },
    { key: "paymentMethod", header: "Método" },
    {
      key: "status",
      header: "Pago",
      render: (row) => (
        <Tag tone={PAYMENT_STATUS_TONE[row.status]} size="sm">
          {PAYMENT_STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
    {
      key: "totalMinutes",
      header: "Paquete",
      render: (row) => (row.totalMinutes === null ? "—" : formatMinutesAsHours(row.totalMinutes)),
    },
    {
      key: "packageStatus",
      header: "Estado paquete",
      render: (row) =>
        row.packageStatus === null ? (
          "—"
        ) : (
          <Tag tone={PACKAGE_STATUS_TONE[row.packageStatus]} size="sm">
            {PACKAGE_STATUS_LABEL[row.packageStatus]}
          </Tag>
        ),
    },
    { key: "date", header: "Fecha", render: (row) => formatShortDateInLima(row.paidAt ?? row.createdAt) },
  ];

  return <DataTable columns={columns} rows={payments} dense onRowClick={(row) => navigate(`/admin/pagos-estudiantes/${row.id}`)} />;
}
