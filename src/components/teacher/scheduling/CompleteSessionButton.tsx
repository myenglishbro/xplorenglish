"use client";

import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { completeSessionAction } from "@/server/scheduling/actions";

export function CompleteSessionButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();

  return (
    <ConfirmActionButton
      label="Finalizar clase"
      icon="check-circle"
      variant="primary"
      confirmTitle="Finalizar clase"
      confirmDescription="Se calcula la duración real de la clase y se registra el pago correspondiente para este período."
      confirmLabel="Finalizar"
      action={() => completeSessionAction(sessionId)}
      onSuccess={() => router.refresh()}
    />
  );
}
