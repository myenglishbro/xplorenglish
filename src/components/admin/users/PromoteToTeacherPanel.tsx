"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { promoteToTeacherAction } from "@/server/admin/users/actions";

export interface PromoteToTeacherPanelProps {
  userId: string;
  fullName: string;
}

// Única transición de rol disponible en esta interfaz: student -> teacher, exclusivamente
// vía promote_user_to_teacher(). No hay ningún control para otros cambios de rol.
export function PromoteToTeacherPanel({ userId, fullName }: PromoteToTeacherPanelProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [hourlyRate, setHourlyRate] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await promoteToTeacherAction(userId, Number(hourlyRate));
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="accent" icon="chalkboard-teacher" onClick={() => setOpen(true)}>
        Promover a docente
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Promover a docente"
        description={`${fullName} pasará a tener rol docente y se creará su perfil de docente con la tarifa indicada.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="accent" onClick={handleConfirm} loading={pending} disabled={pending || hourlyRate === ""}>
              Confirmar
            </Button>
          </>
        }
      >
        {error && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{error}</Alert>}
        <Field label="Tarifa por hora (PEN)" required htmlFor="hourly_rate">
          <Input
            id="hourly_rate"
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            disabled={pending}
          />
        </Field>
      </Modal>
    </>
  );
}
