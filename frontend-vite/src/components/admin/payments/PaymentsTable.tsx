import React from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { Select } from "@/components/ui/forms/Select";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import { useSetReceiptStatus } from "@/features/paymentsAdmin/hooks";
import { RECEIPT_STATUS_LABEL, RECEIPT_STATUS_UNREGISTERED_LABEL, type PaymentListItem, type PaymentStatus, type ReceiptStatus } from "@/server/payments/types";
import { PACKAGE_STATUS_LABEL, PACKAGE_STATUS_TONE } from "@/server/hours/types";

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

/** Opciones editables de BOLETA (FIX 11) -- deliberadamente SIN "Sin registrar": una vez que Admin
 * clasifica un pago con un valor real, no puede volver a NULL. "Sin registrar" solo se agrega
 * como opción cuando es el valor ACTUAL (histórico todavía sin clasificar), nunca como destino. */
const RECEIPT_STATUS_EDIT_OPTIONS = (Object.entries(RECEIPT_STATUS_LABEL) as [ReceiptStatus, string][]).map(([value, label]) => ({ value, label }));

/**
 * Edición inline del estado de BOLETA/comprobante de VENTA (FIX 11) -- NUNCA confundir con
 * PaymentProofSection (evidencia de que el estudiante pagó, vive en el detalle del pago). Llama
 * exclusivamente a admin_set_receipt_status (RPC auditado) vía useSetReceiptStatus -- nunca un
 * UPDATE directo. `stopPropagation` evita que el click en el Select dispare la navegación de fila.
 */
function ReceiptStatusCell({ row }: { row: PaymentListItem }) {
  const mutation = useSetReceiptStatus();
  const [error, setError] = React.useState<string | undefined>();

  const options = row.receiptStatus === null ? [{ value: "unregistered", label: RECEIPT_STATUS_UNREGISTERED_LABEL }, ...RECEIPT_STATUS_EDIT_OPTIONS] : RECEIPT_STATUS_EDIT_OPTIONS;
  const value = row.receiptStatus ?? "unregistered";

  async function handleChange(next: string) {
    if (next === "unregistered" || next === value || mutation.isPending) return;
    setError(undefined);
    try {
      await mutation.mutateAsync({ paymentId: row.id, status: next as ReceiptStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar la boleta.");
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Select value={value} options={options} onChange={(e) => handleChange(e.target.value)} disabled={mutation.isPending} style={{ minWidth: 150 }} />
      {error && <span style={{ color: "var(--danger-fg)", font: "var(--weight-regular) 11px/1.3 var(--font-body)" }}>{error}</span>}
    </span>
  );
}

export function PaymentsTable({ payments }: { payments: PaymentListItem[] }) {
  const navigate = useNavigate();

  const columns: DataTableColumn<PaymentListItem>[] = [
    {
      key: "studentName",
      header: "Estudiante",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
            {row.studentName}
          </span>
          <span style={{ font: "var(--weight-regular) var(--text-micro-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
            {row.studentDni ? `DNI ${row.studentDni}` : "DNI no registrado"}
          </span>
        </div>
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
    {
      key: "receiptStatus",
      header: "Boleta",
      render: (row) => <ReceiptStatusCell row={row} />,
    },
    { key: "date", header: "Fecha", render: (row) => formatShortDateInLima(row.paidAt ?? row.createdAt) },
  ];

  return <DataTable columns={columns} rows={payments} dense onRowClick={(row) => navigate(`/admin/pagos-estudiantes/${row.id}`)} />;
}
