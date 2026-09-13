"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadTeacherReceiptFile } from "@/lib/storage/teacherReceipts";
import { registerTeacherReceiptAction } from "@/server/payroll/actions";
import { ViewReceiptButton } from "@/components/admin/payroll/ViewReceiptButton";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import type { PayrollPeriodStatus, PayrollReceiptSummary } from "@/server/payroll/types";

export interface TeacherReceiptSectionProps {
  periodId: number;
  teacherId: string;
  status: PayrollPeriodStatus;
  receipt: PayrollReceiptSummary | null;
}

/** Mismos 3 status en los que can_manage_receipt (Storage, 0010) y upload_teacher_receipt (RPC,
 * 0009) todavía permiten escribir -- 'approved'/'paid' quedan fuera, ahí solo se puede Ver. */
const EDITABLE_STATUSES: PayrollPeriodStatus[] = ["pending", "pending_receipt", "receipt_uploaded"];

/**
 * Sube/reemplaza el recibo del propio docente. Dos pasos, cada uno con su propia autoridad real:
 * 1) Storage directo navegador->bucket (uploadTeacherReceiptFile) -- RLS decide si procede.
 * 2) registerTeacherReceiptAction -> upload_teacher_receipt (RPC) -- única fuente de verdad de
 *    la fila en teacher_receipts y de si el periodo pasa a 'receipt_uploaded'.
 * Sin UI optimista: el botón queda en loading hasta que AMBOS pasos confirman, recién ahí se
 * refresca la página para mostrar el estado real.
 */
export function TeacherReceiptSection({ periodId, teacherId, status, receipt }: TeacherReceiptSectionProps) {
  const router = useRouter();
  const inputId = React.useId();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const canEdit = EDITABLE_STATUSES.includes(status);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;

    setPending(true);
    setError(undefined);

    const supabase = createClient();
    const uploadResult = await uploadTeacherReceiptFile(supabase, teacherId, periodId, file);
    if ("error" in uploadResult) {
      setError(uploadResult.error);
      setPending(false);
      return;
    }

    const registerResult = await registerTeacherReceiptAction(periodId, uploadResult.path);
    if (registerResult.error) {
      setError(registerResult.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {receipt && <ViewReceiptButton filePath={receipt.filePath} />}

        {canEdit && (
          <Button
            variant={receipt ? "ghost" : "primary"}
            size="sm"
            icon="upload-simple"
            loading={pending}
            disabled={pending}
            onClick={() => document.getElementById(inputId)?.click()}
          >
            {receipt ? "Reemplazar recibo" : "Subir recibo"}
          </Button>
        )}
        <input
          id={inputId}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={pending}
          style={{ display: "none" }}
        />
      </div>

      {!receipt && !canEdit && <span style={{ color: "var(--text-muted)" }}>Sin recibo.</span>}
    </div>
  );
}
