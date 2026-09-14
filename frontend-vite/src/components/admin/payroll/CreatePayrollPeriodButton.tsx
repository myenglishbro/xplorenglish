import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreatePayrollPeriod, type CreatePayrollPeriodFieldErrors } from "@/features/payrollAdmin/hooks";

export interface CreatePayrollPeriodButtonProps {
  teachers: { id: string; firstName: string; lastName: string }[];
}

/**
 * Envoltorio delgado sobre create_teacher_payment_period (0009) -- este form nunca calcula
 * total_minutes/total_amount ni decide qué horas entran: eso lo resuelve el RPC leyendo
 * teacher_hours_log directamente. Si no hay horas elegibles, el RPC devuelve NO_ELIGIBLE_HOURS.
 */
export function CreatePayrollPeriodButton({ teachers }: CreatePayrollPeriodButtonProps) {
  const formId = React.useId();
  const mutation = useCreatePayrollPeriod();
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<CreatePayrollPeriodFieldErrors>({});
  const [teacherId, setTeacherId] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");

  const teacherOptions = [
    { value: "", label: "Selecciona un docente" },
    ...teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
  ];

  function handleOpen() {
    setFieldErrors({});
    setTeacherId("");
    setPeriodStart("");
    setPeriodEnd("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    try {
      await mutation.mutateAsync({ teacherId, periodStart, periodEnd });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: CreatePayrollPeriodFieldErrors }).fieldErrors);
      }
    }
  }

  return (
    <>
      <Button variant="primary" icon="plus" onClick={handleOpen}>
        Crear periodo de pago
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Crear periodo de pago"
        description="Agrupa las horas dictadas por el docente, todavía sin periodo asignado, dentro del rango de fechas indicado."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Crear periodo
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
          <Field label="Docente" required htmlFor="payrollTeacherId" error={fieldErrors.teacherId}>
            <Select id="payrollTeacherId" value={teacherId} options={teacherOptions} onChange={(e) => setTeacherId(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Fecha inicio" required htmlFor="payrollPeriodStart" error={fieldErrors.periodStart}>
              <Input id="payrollPeriodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} disabled={mutation.isPending} />
            </Field>
            <Field label="Fecha fin" required htmlFor="payrollPeriodEnd" error={fieldErrors.periodEnd}>
              <Input id="payrollPeriodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} disabled={mutation.isPending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
