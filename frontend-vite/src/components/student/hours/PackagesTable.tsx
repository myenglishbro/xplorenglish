"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import { PACKAGE_STATUS_LABEL, PACKAGE_STATUS_TONE, type HoursPackageItem } from "@/server/hours/types";

/**
 * 100% solo lectura -- remainingMinutes ya viene calculado desde el ledger en el servidor
 * (getStudentHoursPackages), este componente solo formatea y muestra.
 *
 * Auditoría Slice I: la columna NUNCA se llama "Saldo" -- remainingMinutes es un dato histórico
 * por PAQUETE (ajustado solo por refund/adjustment/expiration atados a ese package_id), no el saldo
 * operativo del estudiante. El consumo real de register_class/correct_class nace con
 * package_id=NULL, así que este número casi nunca baja por clases dictadas -- mostrarlo como
 * "Saldo" confundiría con el número real (useStudentBalance, ledger completo).
 */
export function PackagesTable({ packages }: { packages: HoursPackageItem[] }) {
  const columns: DataTableColumn<HoursPackageItem>[] = [
    {
      key: "packageLabel",
      header: "Paquete",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.packageLabel}
        </span>
      ),
    },
    { key: "totalMinutes", header: "Comprado", render: (row) => formatMinutesAsHours(row.totalMinutes) },
    { key: "remainingMinutes", header: "Restante del paquete", render: (row) => formatMinutesAsHours(row.remainingMinutes) },
    { key: "purchasedAt", header: "Comprado el", render: (row) => formatShortDateInLima(row.purchasedAt) },
    { key: "expiresAt", header: "Vence", render: (row) => (row.expiresAt ? formatShortDateInLima(row.expiresAt) : "—") },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <Tag tone={PACKAGE_STATUS_TONE[row.status]} size="sm">
          {PACKAGE_STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
  ];

  return <DataTable columns={columns} rows={packages} dense />;
}
