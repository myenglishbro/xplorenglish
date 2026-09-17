import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";

export interface ReasonConfirmButtonProps {
  label: string;
  icon?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Estilo destructivo (texto/ícono en rojo) para acciones irreversibles-adyacentes -- nunca un
   * DELETE real (eso sigue sin implementarse), pero sí cambian estado financiero/operativo. */
  destructive?: boolean;
  disabled?: boolean;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;
  /** Placeholder del campo de motivo. */
  reasonPlaceholder?: string;
  action: (reason: string) => Promise<{ error?: string }>;
  onSuccess?: () => void;
}

/**
 * Confirmación reforzada para operaciones administrativas sensibles (archivar usuario, cancelar/
 * reembolsar paquete de horas) -- motivo obligatorio, espera la respuesta real del servidor antes
 * de cerrar (sin UI optimista, mismo criterio que ConfirmActionButton en components/scheduling).
 * Deliberadamente NO se usa para "Eliminar definitivamente" -- esa acción no existe en este slice
 * (hard delete de usuarios fue descartado). Componente nuevo en vez de extender
 * ConfirmActionButton para no arriesgar sus 7 consumidores existentes (content editor,
 * scheduling, gastos), que no necesitan motivo.
 */
export function ReasonConfirmButton({
  label,
  icon,
  variant = "secondary",
  size = "sm",
  destructive,
  disabled,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  reasonPlaceholder = "Motivo (obligatorio)…",
  action,
  onSuccess,
}: ReasonConfirmButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  function handleOpen() {
    setReason("");
    setError(undefined);
    setOpen(true);
  }

  async function handleConfirm() {
    if (pending) return;
    if (!reason.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    setPending(true);
    setError(undefined);
    const result = await action(reason.trim());
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
        onClick={handleOpen}
        style={destructive ? { color: "var(--danger-solid)" } : undefined}
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
            <Button variant={destructive ? "danger" : "primary"} onClick={handleConfirm} loading={pending} disabled={pending}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Motivo" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonPlaceholder} rows={3} disabled={pending} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
