"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { createPayrollPeriodAction, type PayrollActionState } from "@/server/payroll/actions";

export interface CreatePayrollPeriodButtonProps {
  teachers: { id: string; firstName: string; lastName: string }[];
}

/**
 * Envoltorio delgado sobre create_teacher_payment_period (0009) -- este form nunca calcula
 * total_minutes/total_amount ni decide qué horas entran: eso lo resuelve el RPC leyendo
 * teacher_hours_log directamente. Si no hay horas elegibles, el RPC devuelve NO_ELIGIBLE_HOURS,
 * que la action ya traduce a un mensaje legible.
 */
export function CreatePayrollPeriodButton({ teachers }: CreatePayrollPeriodButtonProps) {
  const router = useRouter();
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<PayrollActionState>({});
  const [teacherId, setTeacherId] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");

  const teacherOptions = [
    { value: "", label: "Selecciona un docente" },
    ...teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
  ];

  function handleOpen() {
    setState({});
    setTeacherId("");
    setPeriodStart("");
    setPeriodEnd("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});

    const formData = new FormData();
    formData.set("teacherId", teacherId);
    formData.set("periodStart", periodStart);
    formData.set("periodEnd", periodEnd);

    const result = await createPayrollPeriodAction(formData);
    setState(result);
    setPending(false);
    if (!result.error && !result.fieldErrors) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="primary" icon="plus" onClick={handleOpen}>
        Crear periodo de pago
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Crear periodo de pago"
        description="Agrupa las horas dictadas por el docente, todavía sin periodo asignado, dentro del rango de fechas indicado."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={pending}
              disabled={pending}
            >
              Crear periodo
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <Field label="Docente" required htmlFor="payrollTeacherId" error={state.fieldErrors?.teacherId}>
            <Select id="payrollTeacherId" value={teacherId} options={teacherOptions} onChange={(e) => setTeacherId(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Fecha inicio" required htmlFor="payrollPeriodStart" error={state.fieldErrors?.periodStart}>
              <Input id="payrollPeriodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Fecha fin" required htmlFor="payrollPeriodEnd" error={state.fieldErrors?.periodEnd}>
              <Input id="payrollPeriodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} disabled={pending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
