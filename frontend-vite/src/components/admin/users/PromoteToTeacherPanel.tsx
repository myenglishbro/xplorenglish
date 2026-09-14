import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { usePromoteToTeacher } from "@/features/users/hooks";

export interface PromoteToTeacherPanelProps {
  userId: string;
  fullName: string;
}

// Única transición de rol disponible en esta interfaz: student -> teacher, exclusivamente
// vía promote_user_to_teacher(). No hay ningún control para otros cambios de rol.
export function PromoteToTeacherPanel({ userId, fullName }: PromoteToTeacherPanelProps) {
  const mutation = usePromoteToTeacher(userId);
  const [open, setOpen] = React.useState(false);
  const [hourlyRate, setHourlyRate] = React.useState("");

  async function handleConfirm() {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync(Number(hourlyRate));
      setOpen(false);
    } catch {
      // el error ya queda en mutation.error, se muestra en el modal
    }
  }

  return (
    <>
      <Button variant="accent" icon="chalkboard-teacher" onClick={() => setOpen(true)}>
        Promover a docente
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Promover a docente"
        description={`${fullName} pasará a tener rol docente y se creará su perfil de docente con la tarifa indicada.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button variant="accent" onClick={handleConfirm} loading={mutation.isPending} disabled={mutation.isPending || hourlyRate === ""}>
              Confirmar
            </Button>
          </>
        }
      >
        {mutation.isError && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{(mutation.error as Error).message}</Alert>}
        <Field label="Tarifa por hora (PEN)" required htmlFor="hourly_rate">
          <Input
            id="hourly_rate"
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            disabled={mutation.isPending}
          />
        </Field>
      </Modal>
    </>
  );
}
