"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { viewTeacherReceipt } from "@/lib/storage/teacherReceipts";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";

export function ViewReceiptButton({ filePath }: { filePath: string }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleView() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const result = await viewTeacherReceipt(supabase, filePath);
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button variant="secondary" size="sm" icon="file-text" onClick={handleView} loading={pending} disabled={pending}>
        Ver / Descargar
      </Button>
    </div>
  );
}
