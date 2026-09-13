"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadPaymentProof, viewPaymentProof } from "@/lib/storage/paymentProofs";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";

export interface PaymentProofSectionProps {
  studentId: string;
  paymentId: number;
  hasProof: boolean;
}

/**
 * Bucket student-payment-proofs exclusivamente (0010), path <student_id>/<payment_id>/comprobante
 * fijo (ver lib/storage/paymentProofs.ts) -- "reemplazar" es simplemente volver a subir (upsert).
 * Solo admin: esta sección vive únicamente en /admin/pagos-estudiantes/[id], nunca en una pantalla
 * de estudiante. Nada de esto toca materials ni ResourceRenderer -- bucket y flujo totalmente
 * aparte del sistema de recursos académicos (URL-only).
 */
export function PaymentProofSection({ studentId, paymentId, hasProof }: PaymentProofSectionProps) {
  const router = useRouter();
  const inputId = React.useId();
  const [pending, setPending] = React.useState(false);
  const [viewing, setViewing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;

    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const result = await uploadPaymentProof(supabase, studentId, paymentId, file);
    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  async function handleView() {
    if (viewing) return;
    setViewing(true);
    setError(undefined);
    const supabase = createClient();
    const result = await viewPaymentProof(supabase, studentId, paymentId);
    if (result.error) setError(result.error);
    setViewing(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {error && <Alert tone="danger">{error}</Alert>}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {hasProof && (
          <Button variant="secondary" size="sm" icon="file-text" onClick={handleView} loading={viewing} disabled={viewing}>
            Ver / descargar
          </Button>
        )}
        <Button
          variant={hasProof ? "ghost" : "primary"}
          size="sm"
          icon="upload-simple"
          loading={pending}
          disabled={pending}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {hasProof ? "Reemplazar comprobante" : "Subir comprobante"}
        </Button>
        <input id={inputId} type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleFileChange} disabled={pending} style={{ display: "none" }} />
      </div>
      {!hasProof && <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Sin comprobante todavía.</span>}
    </div>
  );
}
