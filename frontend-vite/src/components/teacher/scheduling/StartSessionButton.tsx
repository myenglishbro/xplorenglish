"use client";

import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { useStartSession } from "@/features/scheduling/hooks";

export function StartSessionButton({ sessionId }: { sessionId: number }) {
  const startSession = useStartSession();

  return (
    <ConfirmActionButton
      label="Iniciar clase"
      icon="play"
      variant="primary"
      confirmTitle="Iniciar clase"
      confirmDescription="Se te asigna como docente real de esta sesión y se inicializa la asistencia de los estudiantes."
      confirmLabel="Iniciar"
      action={async () => {
        try {
          await startSession.mutateAsync(sessionId);
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : "No pudimos iniciar la clase." };
        }
      }}
    />
  );
}
