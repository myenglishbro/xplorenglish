"use client";

import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import { useTeacherPaymentClassDetail } from "@/features/reportsAdmin/hooks";
import type { TeacherPaymentClassItem, TeacherPaymentDetailItem } from "@/server/reports/types";

/**
 * Pagos REALES a docentes (FIX 5) -- fuente de verdad: teacher_payments, atribuido por paid_at
 * (deliberadamente distinto de TeacherCostTable, que es costo GENERADO por occurred_at). El total
 * del footer es la suma de totalAmount de esta misma lista -- exactamente reconciliable con el KPI
 * "Docentes pagados" del periodo, porque ambos vienen de la misma query (listTeacherPaymentsForPeriod).
 */
export function TeacherPaymentsTable({ items }: { items: TeacherPaymentDetailItem[] }) {
  const [openPaymentId, setOpenPaymentId] = React.useState<number | null>(null);
  const openPayment = items.find((p) => p.id === openPaymentId) ?? null;

  const columns: DataTableColumn<TeacherPaymentDetailItem>[] = [
    { key: "paidAt", header: "Fecha de pago", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "teacherName", header: "Docente" },
    { key: "classCount", header: "Clases", align: "right" },
    { key: "minutes", header: "Tiempo pagado", align: "right", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "totalAmount", header: "Total pagado", align: "right", render: (row) => formatCurrencyAmount(row.totalAmount, "PEN") },
    {
      key: "action",
      header: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setOpenPaymentId(row.id)}>
          Ver detalle
        </Button>
      ),
    },
  ];

  if (items.length === 0) {
    return (
      <>
        <EmptyState icon="hand-coins" title="No hay pagos docentes registrados en este período">
          Cuando se realice un pago a un profesor con fecha dentro del rango seleccionado, aparecerá acá.
        </EmptyState>
        <TeacherPaymentDetailModal payment={openPayment} onClose={() => setOpenPaymentId(null)} />
      </>
    );
  }

  const total = items.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <>
      <Card
        pad={false}
        footer={
          <div style={{ textAlign: "right", font: "var(--weight-bold) var(--text-body-size)/1 var(--font-display)", color: "var(--text-heading)" }}>
            TOTAL DOCENTES PAGADOS DEL PERIODO: {formatCurrencyAmount(total, "PEN")}
          </div>
        }
      >
        <DataTable columns={columns} rows={items} />
      </Card>

      <TeacherPaymentDetailModal payment={openPayment} onClose={() => setOpenPaymentId(null)} />
    </>
  );
}

function TeacherPaymentDetailModal({ payment, onClose }: { payment: TeacherPaymentDetailItem | null; onClose: () => void }) {
  const detailQuery = useTeacherPaymentClassDetail(payment?.id ?? null);

  const columns: DataTableColumn<TeacherPaymentClassItem>[] = [
    { key: "occurredAt", header: "Fecha de clase", render: (row) => formatShortDateInLima(row.occurredAt) },
    { key: "studentName", header: "Alumno" },
    { key: "minutes", header: "Minutos", align: "right" },
    {
      key: "hourlyRateSnapshot",
      header: "Tarifa",
      align: "right",
      render: (row) => (row.hourlyRateSnapshot != null ? `${formatCurrencyAmount(row.hourlyRateSnapshot, "PEN")}/h` : "—"),
    },
    { key: "amount", header: "Importe", align: "right", render: (row) => (row.amount != null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
  ];

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title={payment ? `Pago a ${payment.teacherName}` : ""}
      description={
        payment
          ? `${formatShortDateInLima(payment.paidAt)} · ${payment.classCount} clase${payment.classCount === 1 ? "" : "s"} · ${formatMinutesAsHours(payment.minutes)} · ${formatCurrencyAmount(payment.totalAmount, "PEN")}`
          : undefined
      }
      width={640}
    >
      {detailQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando clases…" />
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Alert tone="danger">No pudimos cargar el detalle de este pago. Inténtalo de nuevo en unos minutos.</Alert>
      ) : detailQuery.data.length === 0 ? (
        <EmptyState icon="clock-counter-clockwise" title="Sin clases asociadas">
          Este pago no tiene clases vinculadas.
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={detailQuery.data} dense />
      )}
    </Modal>
  );
}
