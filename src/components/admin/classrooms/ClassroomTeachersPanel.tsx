"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tag } from "@/components/ui/core/Tag";
import { assignPrimaryTeacherAction, assignSubstituteTeacherAction, removeClassroomTeacherAction } from "@/server/admin/classrooms/actions";
import type { AssignableTeacher, TeacherMembership } from "@/server/admin/classrooms/types";
import { TEACHER_COMPATIBILITY_LABEL, TEACHER_COMPATIBILITY_TONE } from "@/server/scheduling/types";
import type { ClassroomCompatibilityResult } from "@/server/scheduling/compatibility";

const SECTION_LABEL_STYLE: React.CSSProperties = {
  font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--text-muted)",
  marginBottom: 8,
};

export interface ClassroomTeachersPanelProps {
  classroomId: number;
  teachers: TeacherMembership[];
  assignableTeachers: AssignableTeacher[];
  /** Solo se usa para PRIMARY -- SUBSTITUTE sigue ofreciendo `assignableTeachers` sin filtrar
   * (punto 5 del bloque: "No cambies todavía reglas para SUBSTITUTE"). */
  compatibility: ClassroomCompatibilityResult;
}

export function ClassroomTeachersPanel({ classroomId, teachers, assignableTeachers, compatibility }: ClassroomTeachersPanelProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [primarySelection, setPrimarySelection] = React.useState("");
  const [substituteSelection, setSubstituteSelection] = React.useState("");

  const primary = teachers.find((t) => t.role === "PRIMARY");
  const substitutes = teachers.filter((t) => t.role === "SUBSTITUTE");
  const teacherOptions = assignableTeachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));

  const compatibleTeachers = compatibility.teachers.filter((t) => t.status === "compatible");
  const unavailableTeachers = compatibility.teachers.filter((t) => t.status !== "compatible");
  const primaryOptions = compatibleTeachers.map((t) => ({ value: t.teacherId, label: `${t.firstName} ${t.lastName}` }));
  const canAssignPrimary = compatibility.hasActiveSchedules && primaryOptions.some((option) => option.value === primarySelection);

  async function handleAssignPrimary() {
    if (!canAssignPrimary || pending) return;
    setPending(true);
    setError(undefined);
    const result = await assignPrimaryTeacherAction(classroomId, primarySelection);
    if (result.error) {
      setError(result.error);
    } else {
      setPrimarySelection("");
      router.refresh();
    }
    setPending(false);
  }

  async function handleAssignSubstitute() {
    if (!substituteSelection || pending) return;
    setPending(true);
    setError(undefined);
    const result = await assignSubstituteTeacherAction(classroomId, substituteSelection);
    if (result.error) {
      setError(result.error);
    } else {
      setSubstituteSelection("");
      router.refresh();
    }
    setPending(false);
  }

  async function handleRemove(teacherId: string, role: TeacherMembership["role"]) {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await removeClassroomTeacherAction(classroomId, teacherId, role);
    if (result.error) setError(result.error);
    else router.refresh();
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      {assignableTeachers.length === 0 && (
        <Alert tone="warning">Todavía no hay docentes activos. Promueve a un estudiante a docente desde Usuarios.</Alert>
      )}

      <div>
        <div style={SECTION_LABEL_STYLE}>Titular</div>
        {primary ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {primary.firstName} {primary.lastName}
              <Tag tone="brand" size="sm">Titular</Tag>
            </span>
            <Button variant="ghost" size="sm" onClick={() => handleRemove(primary.teacherId, "PRIMARY")} disabled={pending}>
              Quitar
            </Button>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", marginBottom: 8 }}>Sin titular asignado</div>
        )}
        {!compatibility.hasActiveSchedules && (
          <Alert tone="warning">Define primero el horario del salón antes de asignar un docente titular.</Alert>
        )}
        {compatibility.hasActiveSchedules && primaryOptions.length === 0 && (
          <Alert tone="warning">No hay docentes compatibles con el horario del salón.</Alert>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Select
              value={canAssignPrimary ? primarySelection : ""}
              options={primaryOptions}
              placeholder="Elegir docente…"
              onChange={(e) => setPrimarySelection(e.target.value)}
              disabled={pending || !compatibility.hasActiveSchedules || primaryOptions.length === 0}
            />
          </div>
          <Button variant="secondary" onClick={handleAssignPrimary} disabled={pending || !canAssignPrimary}>
            {primary ? "Cambiar" : "Asignar"}
          </Button>
        </div>
        {compatibility.hasActiveSchedules && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "var(--space-3)" }}>
            {[...compatibleTeachers, ...unavailableTeachers].map((teacher) => (
              <div key={teacher.teacherId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span>{teacher.firstName} {teacher.lastName}</span>
                <Tag tone={TEACHER_COMPATIBILITY_TONE[teacher.status]} size="sm">
                  {TEACHER_COMPATIBILITY_LABEL[teacher.status]}
                </Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={SECTION_LABEL_STYLE}>Suplentes</div>
        {substitutes.length === 0 ? (
          <div style={{ color: "var(--text-muted)", marginBottom: 8 }}>Sin suplentes</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {substitutes.map((s) => (
              <div key={s.teacherId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{s.firstName} {s.lastName}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(s.teacherId, "SUBSTITUTE")} disabled={pending}>
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Select
              value={substituteSelection}
              options={teacherOptions}
              placeholder="Elegir docente…"
              onChange={(e) => setSubstituteSelection(e.target.value)}
              disabled={pending}
            />
          </div>
          <Button variant="secondary" onClick={handleAssignSubstitute} disabled={pending || !substituteSelection}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
