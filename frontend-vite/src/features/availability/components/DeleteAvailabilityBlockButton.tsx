import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { useDeleteAvailability } from "../hooks";

export function DeleteAvailabilityBlockButton({ blockId, timeRangeLabel }: { blockId: number; timeRangeLabel: string }) {
  const deleteMutation = useDeleteAvailability();

  return (
    <ConfirmActionButton
      label="Eliminar"
      icon="trash"
      variant="ghost"
      size="sm"
      confirmTitle="Eliminar bloque de disponibilidad"
      confirmDescription={`Se eliminará el bloque ${timeRangeLabel}. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      action={async () => {
        try {
          await deleteMutation.mutateAsync(blockId);
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : "No pudimos eliminar el bloque. Inténtalo de nuevo en unos minutos." };
        }
      }}
    />
  );
}
