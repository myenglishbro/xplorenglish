import React from "react";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useAddClassroomTeacher, useRemoveClassroomTeacher } from "@/features/classroomsAdmin/hooks";
import type { AssignableTeacher, TeacherMembership } from "@/server/admin/classrooms/types";

export interface ClassroomTeachersPanelProps {
  classroomId: number;
  teachers: TeacherMembership[];
  assignableTeachers: AssignableTeacher[];
}

/**
 * Profesores habilitados (Slice F) -- sin PRIMARY/SUBSTITUTE/titular/suplente (Slice A). Cualquier
 * profesor habilitado puede registrar clases en este salón. Quitar a un profesor solo desactiva su
 * membresía (status='inactive') -- nunca borra ni modifica sus class_records/pagos históricos.
 */
export function ClassroomTeachersPanel({ classroomId, teachers, assignableTeachers }: ClassroomTeachersPanelProps) {
  const addTeacher = useAddClassroomTeacher(classroomId);
  const removeTeacher = useRemoveClassroomTeacher(classroomId);
  const pending = addTeacher.isPending || removeTeacher.isPending;
  const [error, setError] = React.useState<string | undefined>();
  const [selection, setSelection] = React.useState("");

  const enabledIds = new Set(teachers.map((t) => t.teacherId));
  const candidates = assignableTeachers.filter((t) => !enabledIds.has(t.id));
  const options = candidates.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));

  async function handleAdd() {
    if (!selection || pending) return;
    setError(undefined);
    try {
      await addTeacher.mutateAsync(selection);
      setSelection("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRemove(teacherId: string) {
    if (pending) return;
    setError(undefined);
    try {
      await removeTeacher.mutateAsync(teacherId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      {teachers.length === 0 ? (
        <div style={{ color: "var(--text-muted)" }}>Sin profesores habilitados todavía.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {teachers.map((t) => (
            <div key={t.teacherId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                {t.firstName} {t.lastName}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(t.teacherId)} disabled={pending}>
                Quitar
              </Button>
            </div>
          ))}
        </div>
      )}

      {candidates.length === 0 && assignableTeachers.length === 0 && (
        <Alert tone="warning">Todavía no hay docentes activos. Promueve a un estudiante a docente desde Usuarios.</Alert>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Select value={selection} options={options} placeholder="Elegir docente…" onChange={(e) => setSelection(e.target.value)} disabled={pending} />
        </div>
        <Button variant="secondary" onClick={handleAdd} disabled={pending || !selection}>
          Agregar
        </Button>
      </div>
    </div>
  );
}
