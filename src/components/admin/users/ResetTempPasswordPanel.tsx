"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Alert } from "@/components/ui/feedback/Alert";
import { TempPasswordReveal } from "@/components/admin/shared/TempPasswordReveal";
import { resetStudentTempPasswordAction } from "@/server/admin/users/actions";

export interface ResetTempPasswordPanelProps {
  userId: string;
  fullName: string;
}

/**
 * Regenera la contraseña temporal de un estudiante. Requiere confirmación explícita porque
 * invalida de inmediato la contraseña actual del estudiante (autenticada o no) -- ver
 * resetStudentTempPasswordAction para el orden Auth-primero/DB-después.
 */
export function ResetTempPasswordPanel({ userId, fullName }: ResetTempPasswordPanelProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [tempPassword, setTempPassword] = React.useState<string | undefined>();

  function handleOpen() {
    setError(undefined);
    setTempPassword(undefined);
    setOpen(true);
  }

  function handleClose() {
    if (pending) return;
    setOpen(false);
    if (tempPassword) {
      // Se generó una contraseña nueva durante esta apertura del modal: al cerrar, refrescamos
      // para que el resto de la página (estado de acceso, etc.) refleje must_change_password.
      router.refresh();
    }
  }

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await resetStudentTempPasswordAction(userId);
      if (result.success) {
        setTempPassword(result.success.tempPassword);
      }
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setPending(false);
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
              <Button variant="secondary" onClick={handleClose} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirm} loading={pending} disabled={pending}>
                Sí, regenerar
              </Button>
            </>
          )
        }
      >
        {error && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{error}</Alert>}
        {tempPassword && <TempPasswordReveal password={tempPassword} label={`Nueva contraseña temporal de ${fullName}`} />}
      </Modal>
    </>
  );
}
