"use client";

import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { useCompleteSession } from "@/features/scheduling/hooks";

export function CompleteSessionButton({ sessionId }: { sessionId: number }) {
  const completeSession = useCompleteSession();

  return (
    <ConfirmActionButton
      label="Finalizar clase"
      icon="check-circle"
      variant="primary"
      confirmTitle="Finalizar clase"
      confirmDescription="Se calcula la duración real de la clase y se registra el pago correspondiente para este período."
      confirmLabel="Finalizar"
      action={async () => {
        try {
          await completeSession.mutateAsync(sessionId);
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : "No pudimos finalizar la clase." };
        }
      }}
    />
  );
}
