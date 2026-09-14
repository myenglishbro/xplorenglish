import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useInitializeAttendance } from "@/features/schedulingAdmin/hooks";

/** Sin modal de confirmación (no destructivo, idempotente) -- pero SÍ espera la respuesta real
 * del servidor antes de reflejar nada, como el resto de este bloque. */
export function GenerateRosterButton({ sessionId }: { sessionId: number }) {
  const mutation = useInitializeAttendance(sessionId);

  async function handleClick() {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync();
    } catch {
      // el error ya queda en mutation.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
      <Button variant="primary" size="sm" icon="users-three" onClick={handleClick} loading={mutation.isPending} disabled={mutation.isPending}>
        Generar roster
      </Button>
      {mutation.isError && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
    </div>
  );
}
