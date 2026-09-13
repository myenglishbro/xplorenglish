"use client";

import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { Alert } from "@/components/ui/feedback/Alert";
import { approvePayrollPeriodAction, markPayrollPeriodPaidAction } from "@/server/payroll/actions";
import type { PayrollPeriodStatus } from "@/server/payroll/types";

/**
 * Refleja EXACTAMENTE las transiciones reales de los RPC (0009), no una versión simplificada:
 * approve_teacher_payment_period exige status='receipt_uploaded' (MISSING_RECEIPT en cualquier
 * otro caso, incluido 'pending') -- por eso 'pending'/'pending_receipt' NUNCA ofrecen un botón
 * "Aprobar" que fallaría siempre, solo un aviso. mark_teacher_payment_period_paid exige
 * status='approved'. 'paid' es terminal (bloqueado además por trigger en 0008).
 */
export function PayrollPeriodActions({ periodId, status }: { periodId: number; status: PayrollPeriodStatus }) {
  const router = useRouter();

  if (status === "receipt_uploaded") {
    return (
      <ConfirmActionButton
        label="Aprobar periodo"
        icon="check-circle"
        variant="primary"
        confirmTitle="Aprobar periodo de pago"
        confirmDescription="El periodo pasará a estado Aprobado. El siguiente paso es marcarlo como pagado."
        confirmLabel="Aprobar"
        action={() => approvePayrollPeriodAction(periodId)}
        onSuccess={() => router.refresh()}
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
        action={() => markPayrollPeriodPaidAction(periodId)}
        onSuccess={() => router.refresh()}
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
