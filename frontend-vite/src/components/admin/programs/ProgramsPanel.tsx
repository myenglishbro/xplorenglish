import React from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Switch } from "@/components/ui/forms/Switch";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useCreateProgram, useSetProgramActive, useUpdateProgram, type ProgramFieldErrors } from "@/features/programs/hooks";
import type { ProgramListItem } from "@/server/admin/programs/types";

function ProgramFormFields({ fieldErrors, error, defaultName, defaultDescription }: { fieldErrors: ProgramFieldErrors; error?: string; defaultName?: string; defaultDescription?: string | null }) {
  return (
    <>
      {error && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{error}</Alert>}
      <Field label="Nombre" required htmlFor="name" error={fieldErrors.name}>
        <Input id="name" name="name" defaultValue={defaultName} />
      </Field>
      <Field label="Descripción" htmlFor="description" error={fieldErrors.description} style={{ marginTop: "var(--space-4)" }}>
        <Input id="description" name="description" defaultValue={defaultDescription ?? ""} />
      </Field>
    </>
  );
}

function ActiveToggle({ program }: { program: ProgramListItem }) {
  const mutation = useSetProgramActive();
  const [checked, setChecked] = React.useState(program.isActive);

  async function handleChange() {
    if (mutation.isPending) return;
    const next = !checked;
    try {
      await mutation.mutateAsync({ programId: program.id, isActive: next });
      setChecked(next);
    } catch {
      // el error se pierde intencionalmente acá (mismo criterio que el original: sin feedback inline en la tabla)
    }
  }

  return <Switch checked={checked} onChange={handleChange} disabled={mutation.isPending} label={checked ? "Activo" : "Inactivo"} />;
}

function EditProgramButton({ program }: { program: ProgramListItem }) {
  const mutation = useUpdateProgram(program.id);
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<ProgramFieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({ name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? "") });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ProgramFieldErrors }).fieldErrors);
      }
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" icon="pencil-simple" onClick={() => { setFieldErrors({}); setOpen(true); }}>
        Editar
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Editar programa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(`edit-program-form-${program.id}`) as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={`edit-program-form-${program.id}`} onSubmit={handleSubmit}>
          <ProgramFormFields
            fieldErrors={fieldErrors}
            error={mutation.isError && !Object.keys(fieldErrors).length ? (mutation.error as Error).message : undefined}
            defaultName={program.name}
            defaultDescription={program.description}
          />
        </form>
      </Modal>
    </>
  );
}

function CreateProgramButton() {
  const mutation = useCreateProgram();
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<ProgramFieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({ name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? "") });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ProgramFieldErrors }).fieldErrors);
      }
    }
  }

  return (
    <>
      <Button variant="primary" icon="plus" onClick={() => { setFieldErrors({}); setOpen(true); }}>
        Crear programa
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Crear programa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById("create-program-form") as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Crear
            </Button>
          </>
        }
      >
        <form id="create-program-form" onSubmit={handleSubmit}>
          <ProgramFormFields fieldErrors={fieldErrors} error={mutation.isError && !Object.keys(fieldErrors).length ? (mutation.error as Error).message : undefined} />
        </form>
      </Modal>
    </>
  );
}

export function ProgramsPanel({ programs }: { programs: ProgramListItem[] }) {
  const columns: DataTableColumn<ProgramListItem>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{row.name}</span>,
    },
    { key: "description", header: "Descripción", render: (row) => row.description ?? <span style={{ color: "var(--text-muted)" }}>—</span> },
    { key: "isActive", header: "Estado", render: (row) => <Tag tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Activo" : "Inactivo"}</Tag> },
    { key: "toggle", header: "", render: (row) => <ActiveToggle program={row} /> },
    { key: "edit", header: "", align: "right", render: (row) => <EditProgramButton program={row} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <CreateProgramButton />
      </div>
      {programs.length === 0 ? (
        <EmptyState icon="graduation-cap" title="Sin programas todavía">
          Crea el primero para poder asignarlo a un salón.
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={programs} />
      )}
    </div>
  );
}
