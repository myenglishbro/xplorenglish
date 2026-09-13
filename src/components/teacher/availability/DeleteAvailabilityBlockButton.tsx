"use client";

import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { deleteAvailabilityBlockAction } from "@/server/teacher/availability/actions";

export function DeleteAvailabilityBlockButton({
  blockId,
  timeRangeLabel,
  onDeleted,
}: {
  blockId: number;
  timeRangeLabel: string;
  /** PILOTO 1A: la action ya no revalida la ruta -- ver AvailabilityBlockButton.onSaved. */
  onDeleted: () => void | Promise<void>;
}) {
  return (
    <ConfirmActionButton
      label="Eliminar"
      icon="trash"
      variant="ghost"
      size="sm"
      confirmTitle="Eliminar bloque de disponibilidad"
      confirmDescription={`Se eliminará el bloque ${timeRangeLabel}. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      action={() => deleteAvailabilityBlockAction(blockId)}
      onSuccess={onDeleted}
    />
  );
}
