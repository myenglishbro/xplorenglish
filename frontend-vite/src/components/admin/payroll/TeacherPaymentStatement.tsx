import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Checkbox } from "@/components/ui/forms/Checkbox";
import { Tag } from "@/components/ui/core/Tag";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { usePayTeacherClasses } from "@/features/payrollAdmin/hooks";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_STATUS_TONE, type TeacherPaymentStatementRow } from "@/server/payroll/types";

const STATUS_LABEL: Record<TeacherPaymentStatementRow["status"], string> = {
  present: "Presente",
  absent: "Ausente",
  rescheduled: "Reprogramada",
};

/**
 * Estado de cuenta cronológico de un profesor (Slice E). Solo las filas PENDIENTE + remunerables
 * tienen checkbox; las PAGADAS quedan exactamente en su posición cronológica (nunca se mueven al
 * final). Los totales de selección son puramente UX -- pay_teacher_classes recalcula/valida todo
 * en el backend.
 */
export function TeacherPaymentStatement({ teacherId, rows }: { teacherId: string; rows: TeacherPaymentStatementRow[] }) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [reference, setReference] = React.useState("");
  const payClasses = usePayTeacherClasses(teacherId);

  const selectableRows = rows.filter((r) => r.financialStatus === "pending");
  const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelectableSelected ? new Set() : new Set(selectableRows.map((r) => r.id)));
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedMinutes = selectedRows.reduce((sum, r) => sum + r.minutes, 0);
  const selectedAmount = selectedRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  async function handleConfirmPay() {
    await payClasses.mutateAsync({ classRecordIds: [...selected], reference: reference.trim() || null });
    setSelected(new Set());
    setReference("");
    setShowConfirm(false);
  }

  const columns: DataTableColumn<TeacherPaymentStatementRow>[] = [
    {
      key: "select",
      header: "",
      render: (row) =>
        row.financialStatus === "pending" ? (
          <Checkbox checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
        ) : (
          <span style={{ display: "inline-block", width: 20 }} />
        ),
    },
    {
      key: "occurredAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.occurredAt)} · {formatTimeInLima(row.occurredAt)}
        </span>
      ),
    },
    { key: "studentName", header: "Alumno" },
    { key: "classroomName", header: "Salón" },
    { key: "status", header: "Estado", render: (row) => STATUS_LABEL[row.status] },
    { key: "minutes", header: "Minutos", align: "right", render: (row) => (row.minutes > 0 ? formatMinutesAsHours(row.minutes) : "—") },
    { key: "notes", header: "Observación", render: (row) => row.notes ?? "—" },
    {
      key: "hourlyRateSnapshot",
      header: "Tarifa",
      align: "right",
      render: (row) => (row.hourlyRateSnapshot != null ? `${formatCurrencyAmount(row.hourlyRateSnapshot, "PEN")}/h` : "—"),
    },
    { key: "amount", header: "Monto", align: "right", render: (row) => (row.amount != null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
    {
      key: "financialStatus",
      header: "Estado financiero",
      render: (row) => <Tag tone={FINANCIAL_STATUS_TONE[row.financialStatus]}>{FINANCIAL_STATUS_LABEL[row.financialStatus]}</Tag>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {rows.length === 0 ? (
        <EmptyState icon="clock-counter-clockwise" title="Sin clases registradas">
          Cuando este profesor registre clases, aparecerán acá.
        </EmptyState>
      ) : (
        <>
          {selectableRows.length > 0 && (
            <div>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allSelectableSelected ? "Deseleccionar todas" : "Seleccionar todas las pendientes"}
              </Button>
            </div>
          )}

          <Card pad={false}>
            <DataTable columns={columns} rows={rows} dense />
          </Card>

          <div
            style={{
              position: "sticky",
              bottom: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-heading)" }}>
              {selected.size === 0
                ? "Ninguna clase seleccionada"
                : `${selected.size} clase${selected.size === 1 ? "" : "s"} seleccionada${selected.size === 1 ? "" : "s"} · ${formatMinutesAsHours(selectedMinutes)} · ${formatCurrencyAmount(selectedAmount, "PEN")}`}
            </div>
            <Button variant="primary" disabled={selected.size === 0} onClick={() => setShowConfirm(true)}>
              Pagar seleccionadas
            </Button>
          </div>
        </>
      )}

      <Modal
        open={showConfirm}
        onClose={() => (payClasses.isPending ? undefined : setShowConfirm(false))}
        title="Confirmar pago"
        description={`${selected.size} clase${selected.size === 1 ? "" : "s"} · ${formatMinutesAsHours(selectedMinutes)} · ${formatCurrencyAmount(selectedAmount, "PEN")}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={payClasses.isPending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmPay} loading={payClasses.isPending}>
              Confirmar pago
            </Button>
          </>
        }
      >
        <Field label="Referencia / nota de pago (opcional)" htmlFor="paymentReference">
          <Input id="paymentReference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. Yape 16/09" />
        </Field>
        {payClasses.isError && (
          <Alert tone="danger" style={{ marginTop: "var(--space-3)" }}>
            {(payClasses.error as Error).message}
          </Alert>
        )}
      </Modal>
    </div>
  );
}
