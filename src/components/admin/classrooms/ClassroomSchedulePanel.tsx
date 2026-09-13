"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Switch } from "@/components/ui/forms/Switch";
import { Button } from "@/components/ui/core/Button";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { createClassScheduleAction, updateClassScheduleAction, setClassScheduleActiveAction } from "@/server/scheduling/actions";
import { DAY_OF_WEEK_LABELS, type ClassScheduleItem } from "@/server/scheduling/types";

const DAY_OPTIONS = DAY_OF_WEEK_LABELS.map((label, index) => ({ value: String(index), label }));

export interface ClassroomSchedulePanelProps {
  classroomId: number;
  schedules: ClassScheduleItem[];
}

/**
 * class_schedules es la fuente estructurada de horario del salón (día + hora inicio/fin) --
 * schedule_notes (texto libre) no se toca ni se lee acá. Reutiliza tal cual las Server Actions ya
 * existentes de server/scheduling/actions.ts (create/update/setActive) -- mismas que usa
 * ClassSchedulesButton (modal de /admin/calendario) -- esta pantalla solo agrega, en el mismo
 * lugar donde se asigna PRIMARY, la capacidad de EDITAR un bloque existente, que ese modal no
 * ofrecía. Sin UI optimista: cada fila espera confirmación real del server antes de refrescar.
 */
export function ClassroomSchedulePanel({ classroomId, schedules }: ClassroomSchedulePanelProps) {
  const router = useRouter();
  const sorted = [...schedules].sort((a, b) => (a.dayOfWeek === b.dayOfWeek ? a.startTime.localeCompare(b.startTime) : a.dayOfWeek - b.dayOfWeek));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {sorted.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin horarios todavía">
          Agrega el primer bloque semanal abajo.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {sorted.map((schedule) => (
            <ScheduleRow key={schedule.id} schedule={schedule} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}

      <AddScheduleForm classroomId={classroomId} onCreated={() => router.refresh()} />
    </div>
  );
}

function ScheduleRow({ schedule, onChanged }: { schedule: ClassScheduleItem; onChanged: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [dayOfWeek, setDayOfWeek] = React.useState(String(schedule.dayOfWeek));
  const [startTime, setStartTime] = React.useState(schedule.startTime.slice(0, 5));
  const [endTime, setEndTime] = React.useState(schedule.endTime.slice(0, 5));

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await setClassScheduleActiveAction(schedule.id, !schedule.isActive);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  function startEditing() {
    setDayOfWeek(String(schedule.dayOfWeek));
    setStartTime(schedule.startTime.slice(0, 5));
    setEndTime(schedule.endTime.slice(0, 5));
    setError(undefined);
    setFieldErrors({});
    setEditing(true);
  }

  async function handleSave() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("dayOfWeek", dayOfWeek);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);

    const result = await updateClassScheduleAction(schedule.id, formData);
    setPending(false);
    if (result.error || result.fieldErrors) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "var(--space-3)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {error && <Alert tone="danger">{error}</Alert>}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "var(--space-3)" }}>
          <Field label="Día" htmlFor={`day-${schedule.id}`} error={fieldErrors.dayOfWeek}>
            <Select id={`day-${schedule.id}`} value={dayOfWeek} options={DAY_OPTIONS} onChange={(e) => setDayOfWeek(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Inicio" htmlFor={`start-${schedule.id}`} error={fieldErrors.startTime}>
            <Input id={`start-${schedule.id}`} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Fin" htmlFor={`end-${schedule.id}`} error={fieldErrors.endTime}>
            <Input id={`end-${schedule.id}`} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleSave} loading={pending} disabled={pending}>
            Guardar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 14px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-card)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
            {schedule.startTime.slice(0, 5)} – {schedule.endTime.slice(0, 5)}
          </span>
          {!schedule.isActive && (
            <Tag tone="neutral" size="sm">
              Inactivo
            </Tag>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={startEditing} disabled={pending}>
            Editar
          </Button>
          <Switch checked={schedule.isActive} onChange={handleToggle} disabled={pending} />
        </span>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}

function AddScheduleForm({ classroomId, onCreated }: { classroomId: number; onCreated: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [dayOfWeek, setDayOfWeek] = React.useState("1");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("dayOfWeek", dayOfWeek);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);

    const result = await createClassScheduleAction(classroomId, formData);
    setPending(false);
    if (result.error || result.fieldErrors) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setStartTime("");
    setEndTime("");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Día" htmlFor="newScheduleDay" error={fieldErrors.dayOfWeek}>
          <Select id="newScheduleDay" value={dayOfWeek} options={DAY_OPTIONS} onChange={(e) => setDayOfWeek(e.target.value)} disabled={pending} />
        </Field>
        <Field label="Inicio" htmlFor="newScheduleStart" error={fieldErrors.startTime}>
          <Input id="newScheduleStart" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
        </Field>
        <Field label="Fin" htmlFor="newScheduleEnd" error={fieldErrors.endTime}>
          <Input id="newScheduleEnd" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="secondary" size="sm" icon="plus" loading={pending} disabled={pending}>
          Agregar horario
        </Button>
      </div>
    </form>
  );
}
