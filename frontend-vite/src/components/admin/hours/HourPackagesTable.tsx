import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { ReasonConfirmButton } from "@/components/admin/ReasonConfirmButton";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import { useCancelHoursPackage, useRefundHoursPackage } from "@/features/hoursAdmin/hooks";
import type { AdminHourPackageListItem } from "@/server/admin/hours/types";
import { PACKAGE_STATUS_LABEL, PACKAGE_STATUS_TONE } from "@/server/hours/types";

/**
 * 100% solo lectura salvo cancelar/reembolsar (ciclo de vida de paquetes, versión reducida) --
 * consumedMinutes/remainingMinutes ya vienen calculados desde el ledger (listHourPackagesForAdmin).
 * Compartida por /admin/paquetes (con onRowClick de navegación) y el detalle de un estudiante
 * (sin onRowClick) -- los botones de acción cortan la propagación del click para no disparar la
 * navegación de la fila cuando existe.
 */
export function HourPackagesTable({ packages }: { packages: AdminHourPackageListItem[] }) {
  const navigate = useNavigate();
  const cancelPackage = useCancelHoursPackage();
  const refundPackage = useRefundHoursPackage();

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
        <Tag tone={PACKAGE_STATUS_TONE[row.status]} size="sm">
          {PACKAGE_STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => {
        if (row.status === "cancelled" || row.status === "refunded") return null;
        return (
          <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ReasonConfirmButton
              label="Cancelar"
              variant="ghost"
              size="sm"
              confirmTitle="Cancelar paquete"
              confirmDescription="Retira los minutos de este paquete del saldo del alumno (ajuste, sin implicar devolución de dinero). Se rechaza si el alumno ya consumió más de lo disponible en este paquete."
              confirmLabel="Cancelar paquete"
              reasonPlaceholder="Ej. paquete creado por error…"
              action={async (reason) => {
                try {
                  await cancelPackage.mutateAsync({ packageId: row.id, studentId: row.studentId, reason });
                  return {};
                } catch (err) {
                  return { error: err instanceof Error ? err.message : "No pudimos cancelar el paquete." };
                }
              }}
            />
            <ReasonConfirmButton
              label="Reembolsar"
              variant="ghost"
              size="sm"
              destructive
              confirmTitle="Reembolsar paquete"
              confirmDescription="Retira los minutos de este paquete del saldo del alumno Y marca el pago vinculado como reembolsado (deja de contar como ingreso en Reportes). Se rechaza si el alumno ya consumió más de lo disponible en este paquete."
              confirmLabel="Reembolsar"
              reasonPlaceholder="Ej. el estudiante canceló y se le devolvió el dinero…"
              action={async (reason) => {
                try {
                  await refundPackage.mutateAsync({ packageId: row.id, studentId: row.studentId, reason });
                  return {};
                } catch (err) {
                  return { error: err instanceof Error ? err.message : "No pudimos reembolsar el paquete." };
                }
              }}
            />
          </span>
        );
      },
    },
  ];

  return <DataTable columns={columns} rows={packages} dense onRowClick={(row) => navigate(`/admin/paquetes/${row.studentId}`)} />;
}
