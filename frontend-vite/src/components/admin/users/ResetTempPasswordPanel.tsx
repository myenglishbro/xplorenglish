import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Alert } from "@/components/ui/feedback/Alert";
import { TempPasswordReveal } from "@/components/admin/shared/TempPasswordReveal";
import { useResetTempPassword } from "@/features/users/hooks";

export interface ResetTempPasswordPanelProps {
  userId: string;
  fullName: string;
}

/**
 * Regenera la contraseña temporal de un estudiante. Requiere confirmación explícita porque
 * invalida de inmediato la contraseña actual del estudiante (autenticada o no) -- backend seguro,
 * Edge Function admin-reset-student-password (Supabase).
 */
export function ResetTempPasswordPanel({ userId, fullName }: ResetTempPasswordPanelProps) {
  const mutation = useResetTempPassword(userId);
  const [open, setOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | undefined>();
  const [partialFailureWarning, setPartialFailureWarning] = React.useState<string | undefined>();

  function handleOpen() {
    setTempPassword(undefined);
    setPartialFailureWarning(undefined);
    setOpen(true);
  }

  function handleClose() {
    if (mutation.isPending) return;
    setOpen(false);
  }

  async function handleConfirm() {
    if (mutation.isPending) return;
    try {
      const result = await mutation.mutateAsync();
      setTempPassword(result.tempPassword);
      // Éxito parcial: la contraseña SÍ cambió, pero no pudimos marcarla como temporal en el
      // perfil -- nunca se oculta esto detrás de un éxito silencioso, el admin debe verlo.
      setPartialFailureWarning(result.partialFailureWarning);
    } catch {
      // el error ya queda en mutation.error, se muestra en el modal
    }
  }

  return (
    <>
      <Button variant="danger" icon="arrow-clockwise" onClick={handleOpen}>
        Regenerar contraseña temporal
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        title="Regenerar contraseña temporal"
        description={
          tempPassword
            ? undefined
            : `Esto invalida de inmediato la contraseña actual de ${fullName}. Solo hazlo si la anterior se perdió o el estudiante quedó sin acceso.`
        }
        footer={
          tempPassword ? (
            <Button variant="primary" onClick={handleClose}>
              Listo, ya la copié
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirm} loading={mutation.isPending} disabled={mutation.isPending}>
                Sí, regenerar
              </Button>
            </>
          )
        }
      >
        {mutation.isError && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{(mutation.error as Error).message}</Alert>}
        {partialFailureWarning && (
          <Alert tone="warning" style={{ marginBottom: "var(--space-3)" }}>{partialFailureWarning}</Alert>
        )}
        {tempPassword && <TempPasswordReveal password={tempPassword} label={`Nueva contraseña temporal de ${fullName}`} />}
      </Modal>
    </>
  );
}
