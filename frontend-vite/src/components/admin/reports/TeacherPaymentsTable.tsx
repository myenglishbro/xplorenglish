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
import type { LimaDateRange } from "@/lib/datetime/lima";
import { useTeacherPaymentClassDetail } from "@/features/reportsAdmin/hooks";
import type { TeacherPaymentClassItem, TeacherPaymentClassRangeItem, TeacherPaymentDetailItem } from "@/server/reports/types";

/** Rango de clases de una fila en modo "Fecha de clase" -- "Clase: X" si min=max (una sola clase),
 * "Clases: X – Y" si hay más de una. */
function formatClassDateRange(from: string, to: string): string {
  const fromLabel = formatShortDateInLima(from);
  const toLabel = formatShortDateInLima(to);
  return fromLabel === toLabel ? `Clase: ${fromLabel}` : `Clases: ${fromLabel} – ${toLabel}`;
}

type TeacherPaymentsTableProps =
  | { mode: "payment_date"; items: TeacherPaymentDetailItem[]; range: LimaDateRange }
  | { mode: "class_date"; items: TeacherPaymentClassRangeItem[]; range: LimaDateRange };

/**
 * Pagos a docentes -- dos modos (mejora posterior a la Segunda Etapa):
 * - "payment_date" (FIX 5, comportamiento existente sin cambios): fuente de verdad teacher_payments,
 *   atribuido por paid_at. El total del footer es exactamente reconciliable con el KPI "Docentes
 *   pagados" del periodo, porque ambos vienen de la misma query (listTeacherPaymentsForPeriod).
 * - "class_date" (nuevo): cada fila es la PORCIÓN de un teacher_payment cuyas clases (occurred_at)
 *   caen dentro del rango consultado -- NUNCA el total histórico del payment. El footer suma
 *   únicamente esas porciones, así que deliberadamente puede no coincidir con "Docentes pagados".
 */
export function TeacherPaymentsTable(props: TeacherPaymentsTableProps) {
  const { mode, items, range } = props;
  const [openPaymentId, setOpenPaymentId] = React.useState<number | null>(null);

  if (mode === "payment_date") {
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
          <PaymentDateDetailModal payment={openPayment} onClose={() => setOpenPaymentId(null)} />
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

        <PaymentDateDetailModal payment={openPayment} onClose={() => setOpenPaymentId(null)} />
      </>
    );
  }

  const openPayment = items.find((p) => p.id === openPaymentId) ?? null;

  const columns: DataTableColumn<TeacherPaymentClassRangeItem>[] = [
    { key: "paidAt", header: "Fecha de pago", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "teacherName", header: "Docente" },
    { key: "classDateFrom", header: "Clases del periodo", render: (row) => formatClassDateRange(row.classDateFrom, row.classDateTo) },
    { key: "classCount", header: "Clases", align: "right" },
    { key: "minutes", header: "Tiempo", align: "right", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "amount", header: "Importe en el rango", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
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
        <EmptyState icon="hand-coins" title="No hay clases pagadas en este período">
          Cuando existan clases ya pagadas a un profesor con fecha de clase dentro del rango seleccionado, aparecerán acá.
        </EmptyState>
        <ClassDateDetailModal payment={openPayment} range={range} onClose={() => setOpenPaymentId(null)} />
      </>
    );
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <Card
        pad={false}
        footer={
          <div style={{ textAlign: "right", font: "var(--weight-bold) var(--text-body-size)/1 var(--font-display)", color: "var(--text-heading)" }}>
            TOTAL EN EL RANGO: {formatCurrencyAmount(total, "PEN")}
          </div>
        }
      >
        <DataTable columns={columns} rows={items} />
      </Card>

      <ClassDateDetailModal payment={openPayment} range={range} onClose={() => setOpenPaymentId(null)} />
    </>
  );
}

function PaymentDateDetailModal({ payment, onClose }: { payment: TeacherPaymentDetailItem | null; onClose: () => void }) {
  const detailQuery = useTeacherPaymentClassDetail(payment?.id ?? null);

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title={payment ? `Pago a ${payment.teacherName}` : ""}
      description={
        payment
          ? `Fecha de pago: ${formatShortDateInLima(payment.paidAt)} · ${payment.classCount} clase${payment.classCount === 1 ? "" : "s"} · ${formatMinutesAsHours(payment.minutes)} · ${formatCurrencyAmount(payment.totalAmount, "PEN")}`
          : undefined
      }
      width={640}
    >
      <ClassDetailTable query={detailQuery} />
    </Modal>
  );
}

function ClassDateDetailModal({
  payment,
  range,
  onClose,
}: {
  payment: TeacherPaymentClassRangeItem | null;
  range: LimaDateRange;
  onClose: () => void;
}) {
  const detailQuery = useTeacherPaymentClassDetail(payment?.id ?? null, range);

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title={payment ? `Pago a ${payment.teacherName}` : ""}
      description={
        payment
          ? `Fecha de pago: ${formatShortDateInLima(payment.paidAt)} · Clases del periodo: ${
              formatShortDateInLima(payment.classDateFrom) === formatShortDateInLima(payment.classDateTo)
                ? formatShortDateInLima(payment.classDateFrom)
                : `${formatShortDateInLima(payment.classDateFrom)} – ${formatShortDateInLima(payment.classDateTo)}`
            } · ${payment.classCount} clase${payment.classCount === 1 ? "" : "s"} · ${formatMinutesAsHours(payment.minutes)} · ${formatCurrencyAmount(payment.amount, "PEN")}`
          : undefined
      }
      width={640}
    >
      <ClassDetailTable query={detailQuery} />
    </Modal>
  );
}

function ClassDetailTable({ query }: { query: ReturnType<typeof useTeacherPaymentClassDetail> }) {
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

  if (query.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
        <Spinner size={24} label="Cargando clases…" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <Alert tone="danger">No pudimos cargar el detalle de este pago. Inténtalo de nuevo en unos minutos.</Alert>;
  }
  if (query.data.length === 0) {
    return (
      <EmptyState icon="clock-counter-clockwise" title="Sin clases asociadas">
        Este pago no tiene clases vinculadas.
      </EmptyState>
    );
  }
  return <DataTable columns={columns} rows={query.data} dense />;
}
