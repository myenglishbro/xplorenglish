import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateHourPackage, type CreateHourPackageFieldErrors } from "@/features/paymentsAdmin/hooks";

export interface CreateHourPackageButtonProps {
  students: { id: string; firstName: string; lastName: string; dni: string }[];
}

/**
 * Idempotency key: se genera con crypto.randomUUID() UNA sola vez, al abrir el modal (inicio de
 * una intención de compra nueva) -- nunca dentro del submit, nunca uno nuevo por click. Mientras
 * el modal sigue abierto (error temporal, reintento manual con el mismo botón "Guardar"), se
 * reenvía exactamente la misma key -- create_hour_package (0009) la usa para detectar un retry de
 * la MISMA operación y devolver lo ya creado sin duplicar.
 */
export function CreateHourPackageButton({ students }: CreateHourPackageButtonProps) {
  const formId = React.useId();
  const mutation = useCreateHourPackage();
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<CreateHourPackageFieldErrors>({});
  const [idempotencyKey, setIdempotencyKey] = React.useState<string | null>(null);

  const [studentId, setStudentId] = React.useState("");
  const [packageLabel, setPackageLabel] = React.useState("");
  const [totalMinutes, setTotalMinutes] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [currency, setCurrency] = React.useState("PEN");
  const [paymentReference, setPaymentReference] = React.useState("");

  function handleOpen() {
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
    if (mutation.isPending || !idempotencyKey) return;
    setFieldErrors({});

    try {
      await mutation.mutateAsync({
        studentId,
        packageLabel,
        totalMinutes: Number(totalMinutes),
        price: Number(price),
        paymentMethod,
        currency,
        paymentReference: paymentReference.trim(),
        idempotencyKey,
      });
      setOpen(false);
      setIdempotencyKey(null); // esta intención terminó bien; la próxima apertura genera una nueva
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: CreateHourPackageFieldErrors }).fieldErrors);
      }
      // idempotencyKey NO cambia -- un reintento manual reusa exactamente la misma
    }
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
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Registrar pago / paquete"
        description="Crea el pago y el paquete de horas en un solo paso, vía create_hour_package."
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
              Guardar
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
          <Field label="Estudiante" required htmlFor="studentId" error={fieldErrors.studentId}>
            <Select id="studentId" value={studentId} options={studentOptions} onChange={(e) => setStudentId(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <Field label="Etiqueta del paquete" required htmlFor="packageLabel" error={fieldErrors.packageLabel} hint="Ej. '10 horas'">
            <Input id="packageLabel" value={packageLabel} onChange={(e) => setPackageLabel(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Minutos totales" required htmlFor="totalMinutes" error={fieldErrors.totalMinutes}>
              <Input id="totalMinutes" type="number" min={1} step={1} value={totalMinutes} onChange={(e) => setTotalMinutes(e.target.value)} disabled={mutation.isPending} />
            </Field>
            <Field label="Precio" required htmlFor="price" error={fieldErrors.price}>
              <Input id="price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={mutation.isPending} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Método de pago" required htmlFor="paymentMethod" error={fieldErrors.paymentMethod} hint="Ej. 'yape', 'transferencia'">
              <Input id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={mutation.isPending} />
            </Field>
            <Field label="Moneda" htmlFor="currency">
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={mutation.isPending} />
            </Field>
          </div>
          <Field label="Referencia" htmlFor="paymentReference" hint="Opcional -- número de operación, etc.">
            <Input id="paymentReference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} disabled={mutation.isPending} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
