import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Alert } from "@/components/ui/feedback/Alert";
import { useDemoteToStudent } from "@/features/users/hooks";

export interface DemoteToStudentPanelProps {
  userId: string;
  fullName: string;
}

// Transición inversa a PromoteToTeacherPanel: teacher -> student, exclusivamente vía
// demote_teacher_to_student().
export function DemoteToStudentPanel({ userId, fullName }: DemoteToStudentPanelProps) {
  const mutation = useDemoteToStudent(userId);
  const [open, setOpen] = React.useState(false);

  async function handleConfirm() {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync();
      setOpen(false);
    } catch {
      // el error ya queda en mutation.error, se muestra en el modal
    }
  }

  return (
    <>
      <Button variant="secondary" icon="user-graduate" onClick={() => setOpen(true)}>
        Pasar a estudiante
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Pasar a estudiante"
        description={`${fullName} pasará a tener rol estudiante. Su perfil docente y su historial se conservan, pero quedará inactivo como docente.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button variant="accent" onClick={handleConfirm} loading={mutation.isPending} disabled={mutation.isPending}>
              Confirmar
            </Button>
          </>
        }
      >
        {mutation.isError && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
      </Modal>
    </>
  );
}
