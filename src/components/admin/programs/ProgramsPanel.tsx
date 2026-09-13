"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Switch } from "@/components/ui/forms/Switch";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import {
  createProgramAction,
  setProgramActiveAction,
  updateProgramAction,
  type ProgramActionState,
} from "@/server/admin/programs/actions";
import type { ProgramListItem } from "@/server/admin/programs/types";

function ProgramFormFields({ state, defaultName, defaultDescription }: { state: ProgramActionState; defaultName?: string; defaultDescription?: string | null }) {
  return (
    <>
      {state.error && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{state.error}</Alert>}
      <Field label="Nombre" required htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={defaultName} />
      </Field>
      <Field label="Descripción" htmlFor="description" error={state.fieldErrors?.description} style={{ marginTop: "var(--space-4)" }}>
        <Input id="description" name="description" defaultValue={defaultDescription ?? ""} />
      </Field>
    </>
  );
}

function ActiveToggle({ program }: { program: ProgramListItem }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [checked, setChecked] = React.useState(program.isActive);

  async function handleChange() {
    if (pending) return;
    const next = !checked;
    setPending(true);
    const result = await setProgramActiveAction(program.id, next);
    if (!result.error) {
      setChecked(next);
      router.refresh();
    }
    setPending(false);
  }

  return <Switch checked={checked} onChange={handleChange} disabled={pending} label={checked ? "Activo" : "Inactivo"} />;
}

function EditProgramButton({ program }: { program: ProgramListItem }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<ProgramActionState>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateProgramAction(program.id, formData);
    setState(result);
    if (!result.error && !result.fieldErrors) {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" icon="pencil-simple" onClick={() => { setState({}); setOpen(true); }}>
        Editar
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Editar programa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(`edit-program-form-${program.id}`) as HTMLFormElement | null)?.requestSubmit()}
              loading={pending}
              disabled={pending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={`edit-program-form-${program.id}`} onSubmit={handleSubmit}>
          <ProgramFormFields state={state} defaultName={program.name} defaultDescription={program.description} />
        </form>
      </Modal>
    </>
  );
}

function CreateProgramButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<ProgramActionState>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await createProgramAction(formData);
    setState(result);
    if (!result.error && !result.fieldErrors) {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <>
      <Button variant="primary" icon="plus" onClick={() => { setState({}); setOpen(true); }}>
        Crear programa
      </Button>
      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Crear programa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById("create-program-form") as HTMLFormElement | null)?.requestSubmit()}
              loading={pending}
              disabled={pending}
            >
              Crear
            </Button>
          </>
        }
      >
        <form id="create-program-form" onSubmit={handleSubmit}>
          <ProgramFormFields state={state} />
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
