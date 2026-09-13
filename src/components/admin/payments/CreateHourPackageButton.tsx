"use client";

import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { createHourPackageAction } from "@/server/payments/actions";

export interface CreateHourPackageButtonProps {
  students: { id: string; firstName: string; lastName: string; dni: string }[];
}

/**
 * Idempotency key: se genera con crypto.randomUUID() UNA sola vez, al abrir el modal (inicio de
 * una intención de compra nueva) -- nunca dentro del submit, nunca uno nuevo por click. Mientras
 * el modal sigue abierto (error temporal, timeout, reintento manual con el mismo botón "Guardar"),
 * se reenvía exactamente la misma key -- create_hour_package (0009) la usa para detectar un
 * retry de la MISMA operación y devolver lo ya creado sin duplicar. Solo se genera una key nueva
 * cuando la operación anterior terminó bien (el formulario se reinicia) o cuando se cierra este
 * modal y se abre una compra nueva (handleOpen se ejecuta de cero en ambos casos).
 *
 * Sin UI optimista: el botón queda deshabilitado (`pending`) durante toda la llamada, y el
 * resultado se refleja con el RSC actualizado por revalidatePath en la Server Action.
 */
export function CreateHourPackageButton({ students }: CreateHourPackageButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [idempotencyKey, setIdempotencyKey] = React.useState<string | null>(null);

  const [studentId, setStudentId] = React.useState("");
  const [packageLabel, setPackageLabel] = React.useState("");
  const [totalMinutes, setTotalMinutes] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [currency, setCurrency] = React.useState("PEN");
  const [paymentReference, setPaymentReference] = React.useState("");

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setStudentId("");
    setPackageLabel("");
    setTotalMinutes("");
    setPrice("");
    setPaymentMethod("");
    setCurrency("PEN");
    setPaymentReference("");
    setIdempotencyKey(crypto.randomUUID());
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !idempotencyKey) return;
    setPending(true);
    setError(undefined);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("packageLabel", packageLabel);
    formData.set("totalMinutes", totalMinutes);
    formData.set("price", price);
    formData.set("paymentMethod", paymentMethod);
    formData.set("currency", currency);
    if (paymentReference.trim()) formData.set("paymentReference", paymentReference.trim());
    formData.set("idempotencyKey", idempotencyKey);

    const result = await createHourPackageAction(formData);
    if (result.error || result.fieldErrors) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setPending(false);
      return; // idempotencyKey NO cambia -- un reintento manual reusa exactamente la misma
    }

    setPending(false);
    setOpen(false);
    setIdempotencyKey(null); // esta intención terminó bien; la próxima apertura genera una nueva
  }

  const studentOptions = [
    { value: "", label: "Selecciona un estudiante" },
    ...students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.dni})` })),
  ];

  return (
    <>
      <Button variant="primary" size="sm" icon="plus" onClick={handleOpen}>
        Registrar pago
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Registrar pago / paquete"
        description="Crea el pago y el paquete de horas en un solo paso, vía create_hour_package."
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
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Estudiante" required htmlFor="studentId" error={fieldErrors.studentId}>
            <Select id="studentId" value={studentId} options={studentOptions} onChange={(e) => setStudentId(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Etiqueta del paquete" required htmlFor="packageLabel" error={fieldErrors.packageLabel} hint="Ej. '10 horas'">
            <Input id="packageLabel" value={packageLabel} onChange={(e) => setPackageLabel(e.target.value)} disabled={pending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Minutos totales" required htmlFor="totalMinutes" error={fieldErrors.totalMinutes}>
              <Input id="totalMinutes" type="number" min={1} step={1} value={totalMinutes} onChange={(e) => setTotalMinutes(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Precio" required htmlFor="price" error={fieldErrors.price}>
              <Input id="price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={pending} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Método de pago" required htmlFor="paymentMethod" error={fieldErrors.paymentMethod} hint="Ej. 'yape', 'transferencia'">
              <Input id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Moneda" htmlFor="currency">
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={pending} />
            </Field>
          </div>
          <Field label="Referencia" htmlFor="paymentReference" hint="Opcional -- número de operación, etc.">
            <Input id="paymentReference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} disabled={pending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
