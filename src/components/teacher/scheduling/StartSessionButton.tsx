"use client";

import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { startSessionAction } from "@/server/scheduling/actions";

export function StartSessionButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();

  return (
    <ConfirmActionButton
      label="Iniciar clase"
      icon="play"
      variant="primary"
      confirmTitle="Iniciar clase"
      confirmDescription="Se te asigna como docente real de esta sesión y se inicializa la asistencia de los estudiantes."
      confirmLabel="Iniciar"
      action={() => startSessionAction(sessionId)}
      onSuccess={() => router.refresh()}
    />
  );
}
