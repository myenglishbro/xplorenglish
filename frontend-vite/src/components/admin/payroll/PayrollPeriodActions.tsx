import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { Alert } from "@/components/ui/feedback/Alert";
import { useApprovePayrollPeriod, useMarkPayrollPeriodPaid } from "@/features/payrollAdmin/hooks";
import type { PayrollPeriodStatus } from "@/server/payroll/types";

/**
 * Refleja EXACTAMENTE las transiciones reales de los RPC (0009): approve_teacher_payment_period
 * exige status='receipt_uploaded' -- por eso 'pending'/'pending_receipt' nunca ofrecen un botón
 * "Aprobar". mark_teacher_payment_period_paid exige status='approved'. 'paid' es terminal.
 */
export function PayrollPeriodActions({ periodId, status }: { periodId: number; status: PayrollPeriodStatus }) {
  const approve = useApprovePayrollPeriod(periodId);
  const markPaid = useMarkPayrollPeriodPaid(periodId);

  if (status === "receipt_uploaded") {
    return (
      <ConfirmActionButton
        label="Aprobar periodo"
        icon="check-circle"
        variant="primary"
        confirmTitle="Aprobar periodo de pago"
        confirmDescription="El periodo pasará a estado Aprobado. El siguiente paso es marcarlo como pagado."
        confirmLabel="Aprobar"
        action={async () => {
          try {
            await approve.mutateAsync();
            return {};
          } catch (err) {
            return { error: (err as Error).message };
          }
        }}
      />
    );
  }

  if (status === "approved") {
    return (
      <ConfirmActionButton
        label="Marcar como pagado"
        icon="money"
        variant="primary"
        confirmTitle="Marcar periodo como pagado"
        confirmDescription="Esto es definitivo: un periodo pagado ya no se puede modificar."
        confirmLabel="Marcar como pagado"
        action={async () => {
          try {
            await markPaid.mutateAsync();
            return {};
          } catch (err) {
            return { error: (err as Error).message };
          }
        }}
      />
    );
  }

  if (status === "paid") {
    return <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Este periodo ya fue pagado -- es de solo lectura.</span>;
  }

  // pending / pending_receipt
  return (
    <Alert tone="warning" title="Recibo pendiente">
      El docente todavía no subió su recibo para este periodo. No se puede aprobar hasta entonces.
    </Alert>
  );
}
