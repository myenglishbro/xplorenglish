"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { HoursPackageItem, PackageStatus } from "@/server/hours/types";

const STATUS_LABEL: Record<PackageStatus, string> = {
  active: "Activo",
  exhausted: "Agotado",
  expired: "Vencido",
};

const STATUS_TONE: Record<PackageStatus, TagTone> = {
  active: "success",
  exhausted: "neutral",
  expired: "danger",
};

/** 100% solo lectura -- remainingMinutes ya viene calculado desde el ledger en el servidor
 * (getStudentHoursPackages), este componente solo formatea y muestra. */
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
    { key: "remainingMinutes", header: "Saldo", render: (row) => formatMinutesAsHours(row.remainingMinutes) },
    { key: "purchasedAt", header: "Comprado el", render: (row) => formatShortDateInLima(row.purchasedAt) },
    { key: "expiresAt", header: "Vence", render: (row) => (row.expiresAt ? formatShortDateInLima(row.expiresAt) : "—") },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <Tag tone={STATUS_TONE[row.status]} size="sm">
          {STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
  ];

  return <DataTable columns={columns} rows={packages} dense />;
}
