import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag, type TagTone } from "@/components/ui/core/Tag";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { AdminHourPackageListItem } from "@/server/admin/hours/types";
import type { PackageStatus } from "@/server/hours/types";

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

/**
 * 100% solo lectura -- consumedMinutes/remainingMinutes ya vienen calculados desde el ledger
 * (listHourPackagesForAdmin), este componente solo formatea y muestra. Ninguna celda es editable.
 */
export function HourPackagesTable({ packages }: { packages: AdminHourPackageListItem[] }) {
  const navigate = useNavigate();

  const columns: DataTableColumn<AdminHourPackageListItem>[] = [
    {
      key: "student",
      header: "Estudiante",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.studentFirstName} {row.studentLastName}
        </span>
      ),
    },
    { key: "packageLabel", header: "Paquete" },
    { key: "totalMinutes", header: "Adquiridas", align: "center", render: (row) => formatMinutesAsHours(row.totalMinutes) },
    { key: "consumedMinutes", header: "Consumidas", align: "center", render: (row) => formatMinutesAsHours(row.consumedMinutes) },
    { key: "remainingMinutes", header: "Disponibles", align: "center", render: (row) => formatMinutesAsHours(row.remainingMinutes) },
    { key: "purchasedAt", header: "Creado el", render: (row) => formatShortDateInLima(row.purchasedAt) },
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

  return <DataTable columns={columns} rows={packages} dense onRowClick={(row) => navigate(`/admin/paquetes/${row.studentId}`)} />;
}
