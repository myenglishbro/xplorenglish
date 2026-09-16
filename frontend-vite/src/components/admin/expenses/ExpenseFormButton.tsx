import React from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Alert } from "@/components/ui/feedback/Alert";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/server/expenses/types";
import type { ExpenseFieldErrors } from "@/features/expensesAdmin/hooks";

export interface ExpenseFormValues {
  expenseDate: string;
  category: ExpenseCategory | "";
  description: string;
  amount: string;
  paymentMethod: string;
  notes: string;
}

export interface ExpenseFormButtonProps {
  modalTitle: string;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: string;
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (input: { expenseDate: string; category: string; description: string; amount: string; paymentMethod: string; notes: string }) => Promise<void>;
}

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((value) => ({ value, label: EXPENSE_CATEGORY_LABEL[value] }));

const EMPTY_VALUES: ExpenseFormValues = { expenseDate: "", category: "", description: "", amount: "", paymentMethod: "", notes: "" };

/**
 * Genérico para crear y editar -- un solo componente, nunca dos formularios que puedan divergir.
 * Igual patrón que TitleDescriptionFormButton/ResourceFormButton (content): botón disparador +
 * Modal con formulario, sin UI optimista (se espera la respuesta real antes de cerrar). Validación
 * real vive en expenseSchema (server/expenses/validation.ts), llamada por el hook de mutación --
 * este componente solo recolecta el input crudo y muestra los fieldErrors que ese hook lance.
 */
export function ExpenseFormButton({
  modalTitle,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
  defaultValues,
  onSubmit,
}: ExpenseFormButtonProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<ExpenseFieldErrors>({});
  const [values, setValues] = React.useState<ExpenseFormValues>({ ...EMPTY_VALUES, ...defaultValues });

  function handleOpen() {
    setError(undefined);
    setFieldErrors({});
    setValues({ ...EMPTY_VALUES, ...defaultValues });
    setOpen(true);
  }

  function setField<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    setFieldErrors({});
    setPending(true);
    try {
      await onSubmit({
        expenseDate: values.expenseDate,
        category: values.category,
        description: values.description,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ExpenseFieldErrors }).fieldErrors);
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={handleOpen}>
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={modalTitle}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Fecha" required htmlFor="expenseDate" error={fieldErrors.expenseDate}>
              <Input
                id="expenseDate"
                type="date"
                value={values.expenseDate}
                onChange={(e) => setField("expenseDate", e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Categoría" required htmlFor="expenseCategory" error={fieldErrors.category}>
              <Select
                id="expenseCategory"
                value={values.category}
                placeholder="Selecciona una categoría"
                options={CATEGORY_OPTIONS}
                onChange={(e) => setField("category", e.target.value as ExpenseCategory)}
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Descripción" required htmlFor="expenseDescription" error={fieldErrors.description}>
            <Input
              id="expenseDescription"
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={pending}
              placeholder="Ej. Zoom, Meta Ads, Internet…"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Monto" required htmlFor="expenseAmount" error={fieldErrors.amount}>
              <Input
                id="expenseAmount"
                type="number"
                min="0.01"
                step="0.01"
                icon="money"
                value={values.amount}
                onChange={(e) => setField("amount", e.target.value)}
                disabled={pending}
                placeholder="0.00"
              />
            </Field>
            <Field label="Método de pago" required htmlFor="expensePaymentMethod" error={fieldErrors.paymentMethod}>
              <Input
                id="expensePaymentMethod"
                value={values.paymentMethod}
                onChange={(e) => setField("paymentMethod", e.target.value)}
                disabled={pending}
                placeholder="Ej. Transferencia, Tarjeta, Efectivo…"
              />
            </Field>
          </div>
          <Field label="Observación" htmlFor="expenseNotes" error={fieldErrors.notes}>
            <Textarea
              id="expenseNotes"
              value={values.notes}
              onChange={(e) => setField("notes", e.target.value)}
              disabled={pending}
              rows={2}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
