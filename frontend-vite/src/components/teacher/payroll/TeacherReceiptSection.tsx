"use client";

import React from "react";
import { useUploadTeacherReceipt } from "@/features/payroll/hooks";
import { ViewReceiptButton } from "@/components/admin/payroll/ViewReceiptButton";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import type { PayrollPeriodStatus, PayrollReceiptSummary } from "@/server/payroll/types";

export interface TeacherReceiptSectionProps {
  periodId: number;
  status: PayrollPeriodStatus;
  receipt: PayrollReceiptSummary | null;
}

const EDITABLE_STATUSES: PayrollPeriodStatus[] = ["pending", "pending_receipt", "receipt_uploaded"];

export function TeacherReceiptSection({ periodId, status, receipt }: TeacherReceiptSectionProps) {
  const inputId = React.useId();
  const [error, setError] = React.useState<string | undefined>();
  const uploadReceipt = useUploadTeacherReceipt(periodId);
  const canEdit = EDITABLE_STATUSES.includes(status);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadReceipt.isPending) return;
    setError(undefined);
    try {
      await uploadReceipt.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos subir el recibo. Inténtalo de nuevo en unos minutos.");
    }
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
            loading={uploadReceipt.isPending}
            disabled={uploadReceipt.isPending}
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
          disabled={uploadReceipt.isPending}
          style={{ display: "none" }}
        />
      </div>

      {!receipt && !canEdit && <span style={{ color: "var(--text-muted)" }}>Sin recibo.</span>}
    </div>
  );
}
