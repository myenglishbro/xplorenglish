"use client";

import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Alert } from "@/components/ui/feedback/Alert";

export interface ConfirmActionButtonProps {
  label: string;
  icon?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;
  disabled?: boolean;
  /** Espera la respuesta real del servidor -- sin UI optimista. El caller solo ve el cambio
   * reflejado después de que esta promesa resuelve sin error (vía revalidatePath + router.refresh). */
  action: () => Promise<{ error?: string }>;
  onSuccess?: () => void;
}

/**
 * Distinto, a propósito, de ConfirmDeleteButtonOptimistic (contenido académico): ese cierra el
 * modal de inmediato y reconcilia en segundo plano; este espera la respuesta real antes de cerrar
 * -- obligatorio para acciones de calendario (start/complete/reschedule/cancel/reasignar), donde
 * un rollback visual sería más confuso que un loading real (hay dinero/horas de por medio más
 * adelante en el flujo, y el estado de una sesión no es trivialmente reversible como un título).
 */
export function ConfirmActionButton({
  label,
  icon,
  variant = "secondary",
  size = "sm",
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  disabled,
  action,
  onSuccess,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await action();
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    onSuccess?.();
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={icon}
        disabled={disabled}
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={confirmTitle}
        description={confirmDescription}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirm} loading={pending} disabled={pending}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {error && <Alert tone="danger">{error}</Alert>}
      </Modal>
    </>
  );
}
