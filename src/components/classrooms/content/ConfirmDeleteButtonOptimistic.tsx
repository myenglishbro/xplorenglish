"use client";

import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";

export interface ConfirmDeleteButtonOptimisticProps {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  /** Fire-and-forget: nunca espera una Server Action. El caller retira el item del árbol de
   * inmediato y hace rollback (reinsertándolo con el error) si la acción falla, en background. */
  onConfirm: () => void;
}

/**
 * Cierra el modal de inmediato al confirmar, sin esperar ningún resultado de red -- el caller
 * hace el retiro optimista y el rollback (si falla) por su cuenta, en background. Usada para
 * borrar módulo, lección y recurso.
 */
export function ConfirmDeleteButtonOptimistic({ label, confirmTitle, confirmDescription, onConfirm }: ConfirmDeleteButtonOptimisticProps) {
  const [open, setOpen] = React.useState(false);

  function handleConfirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" icon="trash" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={confirmTitle}
        description={confirmDescription}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              Borrar
            </Button>
          </>
        }
      />
    </>
  );
}
