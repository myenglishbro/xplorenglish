import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatShortDateInLima, getMonthRangeInLima } from "@/lib/datetime/lima";
import {
  useMyTeacherPayments,
  useMyTeacherPaymentsForStudent,
  useMyTeacherPaymentClassDetail,
  useMyTeacherPaymentsMonthlyTrend,
  useMyTeacherPaymentsMonthlyTrendForStudent,
} from "@/features/payroll/hooks";
import type { MyTeacherPaymentClassItem, MyTeacherPaymentItem, MyTeacherPaymentStudentItem } from "@/server/payroll/types";
import { MyPaymentsTrendChart } from "./MyPaymentsTrendChart";

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function anchorFromMonthKey(year: number, monthIndexZeroBased: number): Date {
  return new Date(Date.UTC(year, monthIndexZeroBased, 15, 12));
}

function shiftAnchor(anchorDate: Date, deltaMonths: number): Date {
  const { startDate } = getMonthRangeInLima(anchorDate);
  const [y, m] = startDate.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + deltaMonths;
  return anchorFromMonthKey(Math.floor(total / 12), total % 12);
}

export interface MyPaymentsReportProps {
  /** Alumno seleccionado en el filtro (FIX 8) -- null = "Todos mis alumnos", comportamiento
   * idéntico a FIX 6. Con un alumno, todos los montos/tiempos representan SOLO su porción
   * (class_records.amount/minutes), nunca teacher_payments.total_amount/total_minutes completo. */
  studentId: string | null;
  studentName: string | null;
}

/**
 * Reporte financiero de PAGOS REALIZADOS al docente autenticado (FIX 6, ampliado en FIX 8 con
 * filtro por alumno) -- deliberadamente distinto de la tabla de abajo en TeacherPagosPage (deuda/
 * clases pendientes + historial cronológico): acá solo entra dinero que YA se pagó, atribuido por
 * teacher_payments.paid_at. No mezcla ambas cifras -- "me deben X" vive en la tabla de abajo,
 * "me pagaron Y en septiembre" acá.
 */
export function MyPaymentsReport({ studentId, studentName }: MyPaymentsReportProps) {
  const [anchorDate, setAnchorDate] = React.useState<Date>(() => new Date());
  const [monthsBack, setMonthsBack] = React.useState<6 | 12>(6);
  const [openPaymentId, setOpenPaymentId] = React.useState<number | null>(null);

  const isFiltered = studentId !== null;

  const range = getMonthRangeInLima(anchorDate);
  const [year, monthOneBased] = range.startDate.split("-").map(Number) as [number, number];
  const monthLabel = `${MONTHS_ES[monthOneBased - 1]} ${year}`;
  const isCurrentMonth = range.startDate === getMonthRangeInLima(new Date()).startDate;

  // Solo una de las dos rutas está activa a la vez (`enabled`) -- nunca se piden ambas vistas.
  const allPaymentsQuery = useMyTeacherPayments(range, !isFiltered);
  const studentPaymentsQuery = useMyTeacherPaymentsForStudent(studentId, range);
  const allTrendQuery = useMyTeacherPaymentsMonthlyTrend(monthsBack, !isFiltered);
  const studentTrendQuery = useMyTeacherPaymentsMonthlyTrendForStudent(studentId, monthsBack);

  const paymentsQuery = isFiltered ? studentPaymentsQuery : allPaymentsQuery;
  const trendQuery = isFiltered ? studentTrendQuery : allTrendQuery;

  const allPayments = allPaymentsQuery.data ?? [];
  const studentPayments = studentPaymentsQuery.data ?? [];

  const totalAmount = isFiltered ? studentPayments.reduce((sum, p) => sum + p.amount, 0) : allPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalMinutes = isFiltered ? studentPayments.reduce((sum, p) => sum + p.minutes, 0) : allPayments.reduce((sum, p) => sum + p.minutes, 0);
  const paymentsCount = isFiltered ? studentPayments.length : allPayments.length;

  const openPayment = isFiltered ? (studentPayments.find((p) => p.id === openPaymentId) ?? null) : (allPayments.find((p) => p.id === openPaymentId) ?? null);

  const allColumns: DataTableColumn<MyTeacherPaymentItem>[] = [
    { key: "paidAt", header: "Fecha de pago", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "classCount", header: "Clases", align: "right" },
    { key: "minutes", header: "Tiempo pagado", align: "right", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "totalAmount", header: "Total pagado", align: "right", render: (row) => formatCurrencyAmount(row.totalAmount, "PEN") },
    { key: "reference", header: "Referencia", render: (row) => row.reference ?? "—" },
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

  const studentColumns: DataTableColumn<MyTeacherPaymentStudentItem>[] = [
    { key: "paidAt", header: "Fecha de pago", render: (row) => formatShortDateInLima(row.paidAt) },
    { key: "classCount", header: "Clases del alumno", align: "right" },
    { key: "minutes", header: "Tiempo del alumno", align: "right", render: (row) => formatMinutesAsHours(row.minutes) },
    { key: "amount", header: "Importe del alumno", align: "right", render: (row) => formatCurrencyAmount(row.amount, "PEN") },
    { key: "reference", header: "Referencia", render: (row) => row.reference ?? "—" },
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

  return (
    <Card
      header={
        <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Pagos recibidos
        </h2>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" icon="caret-left" onClick={() => setAnchorDate(shiftAnchor(anchorDate, -1))} aria-label="Mes anterior" />
          <span style={{ minWidth: 160, textAlign: "center", font: "var(--weight-bold) var(--text-h4-size)/1 var(--font-display)", letterSpacing: ".02em", color: "var(--text-heading)", textTransform: "capitalize" }}>
            {monthLabel}
          </span>
          <Button variant="secondary" size="sm" icon="caret-right" onClick={() => setAnchorDate(shiftAnchor(anchorDate, 1))} aria-label="Mes siguiente" />
          <Button variant={isCurrentMonth ? "primary" : "ghost"} size="sm" onClick={() => setAnchorDate(new Date())}>
            Este mes
          </Button>
        </div>

        {isFiltered && (
          <Alert tone="info">
            Mostrando la porción de <strong>{studentName ?? "este alumno"}</strong> dentro de tus pagos -- los montos no representan el total oficial de cada pago (que puede incluir clases de otros alumnos).
          </Alert>
        )}

        {paymentsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
            <Spinner size={24} label="Calculando…" />
          </div>
        ) : paymentsQuery.isError ? (
          <Alert tone="danger">No pudimos cargar tus pagos de este periodo. Recarga la página para intentarlo de nuevo.</Alert>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
              <StatCard label="Total pagado" value={formatCurrencyAmount(totalAmount, "PEN")} icon="hand-coins" tone="accent" />
              <StatCard label="Pagos recibidos" value={paymentsCount} icon="receipt" tone="accent" />
              <StatCard label="Tiempo pagado" value={formatMinutesAsHours(totalMinutes)} icon="clock" tone="brand" />
            </div>

            {paymentsCount === 0 && (
              <EmptyState icon="hand-coins" title="No tienes pagos registrados en este periodo">
                {isFiltered
                  ? "Ninguno de tus pagos de este mes incluye clases de este alumno."
                  : "Cuando Administración te realice un pago con fecha dentro de este mes, aparecerá acá."}
              </EmptyState>
            )}
          </>
        )}

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <h3 style={{ margin: 0, font: "var(--weight-semibold) var(--text-body-size)/1.4 var(--font-display)", color: "var(--text-heading)" }}>
              Pagos por mes
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant={monthsBack === 6 ? "primary" : "ghost"} size="sm" onClick={() => setMonthsBack(6)}>
                Últimos 6 meses
              </Button>
              <Button variant={monthsBack === 12 ? "primary" : "ghost"} size="sm" onClick={() => setMonthsBack(12)}>
                Últimos 12 meses
              </Button>
            </div>
          </div>

          {trendQuery.isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
              <Spinner size={20} label="Cargando tendencia…" />
            </div>
          ) : trendQuery.isError || !trendQuery.data ? (
            <Alert tone="danger">No pudimos cargar la tendencia mensual.</Alert>
          ) : (
            <MyPaymentsTrendChart points={trendQuery.data} />
          )}
        </div>

        {paymentsCount > 0 &&
          (isFiltered ? (
            <Card pad={false}>
              <DataTable columns={studentColumns} rows={studentPayments} dense />
            </Card>
          ) : (
            <Card pad={false}>
              <DataTable columns={allColumns} rows={allPayments} dense />
            </Card>
          ))}
      </div>

      <MyPaymentDetailModal
        paymentId={openPaymentId}
        studentId={studentId}
        studentName={studentName}
        summary={openPayment}
        onClose={() => setOpenPaymentId(null)}
      />
    </Card>
  );
}

interface DetailSummary {
  paidAt: string;
  classCount: number;
  minutes: number;
  amount: number;
}

function MyPaymentDetailModal({
  paymentId,
  studentId,
  studentName,
  summary,
  onClose,
}: {
  paymentId: number | null;
  studentId: string | null;
  studentName: string | null;
  summary: (MyTeacherPaymentItem | MyTeacherPaymentStudentItem) | null;
  onClose: () => void;
}) {
  const detailQuery = useMyTeacherPaymentClassDetail(paymentId, studentId);

  const detailSummary: DetailSummary | null = summary
    ? {
        paidAt: summary.paidAt,
        classCount: summary.classCount,
        minutes: summary.minutes,
        amount: typeof summary.totalAmount === "number" ? summary.totalAmount : (summary.amount as number),
      }
    : null;

  const columns: DataTableColumn<MyTeacherPaymentClassItem>[] = [
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
      open={paymentId !== null}
      onClose={onClose}
      title={detailSummary ? `Pago del ${formatShortDateInLima(detailSummary.paidAt)}` : ""}
      description={
        detailSummary
          ? `${detailSummary.classCount} clase${detailSummary.classCount === 1 ? "" : "s"} · ${formatMinutesAsHours(detailSummary.minutes)} · ${formatCurrencyAmount(detailSummary.amount, "PEN")}`
          : undefined
      }
      width={640}
    >
      {studentId && (
        <p style={{ margin: "0 0 var(--space-3)", color: "var(--text-muted)", font: "var(--weight-regular) var(--text-body-sm-size)/1.4 var(--font-body)" }}>
          Mostrando clases de <strong>{studentName ?? "este alumno"}</strong> incluidas en este pago.
        </p>
      )}
      {detailQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando clases…" />
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Alert tone="danger">No pudimos cargar el detalle de este pago. Inténtalo de nuevo en unos minutos.</Alert>
      ) : detailQuery.data.length === 0 ? (
        <EmptyState icon="clock-counter-clockwise" title="No se encontraron clases asociadas a este pago" />
      ) : (
        <DataTable columns={columns} rows={detailQuery.data} dense />
      )}
    </Modal>
  );
}
