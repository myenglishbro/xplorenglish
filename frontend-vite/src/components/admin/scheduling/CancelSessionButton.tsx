import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { useCancelSession } from "@/features/schedulingAdmin/hooks";

export function CancelSessionButton({ sessionId }: { sessionId: number }) {
  const mutation = useCancelSession(sessionId);

  return (
    <ConfirmActionButton
      label="Cancelar"
      icon="x-circle"
      confirmTitle="Cancelar sesión"
      confirmDescription="Esto marca la sesión como cancelada. Solo se puede hacer mientras está programada."
      confirmLabel="Cancelar sesión"
      action={async () => {
        try {
          await mutation.mutateAsync();
          return {};
        } catch (err) {
          return { error: (err as Error).message };
        }
      }}
    />
  );
}
