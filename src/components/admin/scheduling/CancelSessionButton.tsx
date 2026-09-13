"use client";

import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { cancelSessionAction } from "@/server/scheduling/actions";

export function CancelSessionButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();

  return (
    <ConfirmActionButton
      label="Cancelar"
      icon="x-circle"
      confirmTitle="Cancelar sesión"
      confirmDescription="Esto marca la sesión como cancelada. Solo se puede hacer mientras está programada."
      confirmLabel="Cancelar sesión"
      action={() => cancelSessionAction(sessionId)}
      onSuccess={() => router.refresh()}
    />
  );
}
