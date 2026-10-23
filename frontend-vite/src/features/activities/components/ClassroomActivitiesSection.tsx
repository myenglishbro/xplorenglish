import React from "react";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Button } from "@/components/ui/core/Button";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Input } from "@/components/ui/forms/Input";
import { Field } from "@/components/ui/forms/Field";
import { useExercises } from "@/features/questionBank/hooks";
import { KIND_LABELS } from "@/server/questionBank/types";
import { useAssignExercise, useClassroomActivities, useClassroomSubmissions } from "../hooks";
import { StudentActivityCard } from "./StudentActivityCard";
import { TeacherActivityCard } from "./TeacherActivityCard";

export interface ClassroomActivitiesSectionProps {
  classroomId: number;
  role: "teacher" | "student" | "admin";
  /** Un salón archivado no admite nuevas asignaciones. */
  archived?: boolean;
}

export function ClassroomActivitiesSection({ classroomId, role, archived }: ClassroomActivitiesSectionProps) {
  const activitiesQuery = useClassroomActivities(classroomId);
  const submissionsQuery = useClassroomSubmissions(classroomId);
  const [assigning, setAssigning] = React.useState(false);

  const canAssign = role !== "student" && !archived;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {role !== "student" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button icon="plus" disabled={!canAssign} onClick={() => setAssigning(true)}>
            Asignar actividad
          </Button>
        </div>
      )}

      {activitiesQuery.isLoading || submissionsQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando actividades…" />
        </div>
      ) : activitiesQuery.isError || submissionsQuery.isError ? (
        <Alert tone="danger">No pudimos cargar las actividades de este salón.</Alert>
      ) : (activitiesQuery.data ?? []).length === 0 ? (
        <EmptyState icon="list-checks" title="Aún no hay actividades">
          {role === "student" ? "Tu docente asignará ejercicios aquí." : "Pulsa \"Asignar actividad\" para darle un ejercicio a tu estudiante."}
        </EmptyState>
      ) : (
        (activitiesQuery.data ?? []).map((activity) => {
          const attempts = (submissionsQuery.data ?? []).filter((s) => s.activityId === activity.id);
          return role === "student" ? (
            <StudentActivityCard key={activity.id} activity={activity} attempts={attempts} />
          ) : (
            <TeacherActivityCard key={activity.id} activity={activity} submissions={attempts} />
          );
        })
      )}

      {canAssign && <AssignFromBankModal classroomId={classroomId} open={assigning} onClose={() => setAssigning(false)} />}
    </div>
  );
}

function AssignFromBankModal({ classroomId, open, onClose }: { classroomId: number; open: boolean; onClose: () => void }) {
  const { data, isLoading, isError } = useExercises();
  const assign = useAssignExercise();
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<number | null>(null);
  const [due, setDue] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(null);
      setDue("");
      assign.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = (data ?? []).filter((e) => !search.trim() || e.title.toLowerCase().includes(search.trim().toLowerCase()));

  const submit = () => {
    if (selected === null) return;
    assign.mutate({ exerciseId: selected, classroomId, dueAt: due ? new Date(due).toISOString() : null }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={620}
      title="Asignar actividad"
      description="Elige un ejercicio de tu banco. Si luego lo modificas, esta actividad no cambia."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={assign.isPending} disabled={selected === null}>
            Asignar
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Input icon="magnifying-glass" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título…" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {isLoading ? (
            <Spinner size={20} label="Cargando banco…" />
          ) : isError ? (
            <Alert tone="danger">No pudimos cargar el banco de preguntas.</Alert>
          ) : filtered.length === 0 ? (
            <span style={{ color: "var(--text-muted)" }}>El banco no tiene ejercicios que coincidan. Créalos primero en "Banco de preguntas".</span>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelected(e.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  background: selected === e.id ? "var(--surface-accent-subtle)" : "var(--surface-card)",
                  border: `${selected === e.id ? 2 : 1}px solid ${selected === e.id ? "var(--xp-cyan)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  font: "var(--weight-semibold) 14px/1.4 var(--font-body)",
                  color: "var(--text-heading)",
                }}
              >
                {e.title}
                <span style={{ display: "flex", gap: 6 }}>
                  <Tag tone="accent" size="sm">{KIND_LABELS[e.kind]}</Tag>
                  {e.level && <Tag tone="neutral" size="sm">{e.level}</Tag>}
                </span>
              </button>
            ))
          )}
        </div>
        <Field label="Fecha límite (opcional)">
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        {assign.isError && <Alert tone="danger">{assign.error.message}</Alert>}
      </div>
    </Modal>
  );
}
