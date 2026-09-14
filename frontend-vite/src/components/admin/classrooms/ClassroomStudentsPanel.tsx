import React from "react";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { useAddClassroomStudent, useRemoveClassroomStudent } from "@/features/classroomsAdmin/hooks";
import type { AssignableStudent, StudentMembership } from "@/server/admin/classrooms/types";

const SECTION_LABEL_STYLE: React.CSSProperties = {
  font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--text-muted)",
  marginBottom: 8,
};

export interface ClassroomStudentsPanelProps {
  classroomId: number;
  students: StudentMembership[];
  assignableStudents: AssignableStudent[];
}

export function ClassroomStudentsPanel({ classroomId, students, assignableStudents }: ClassroomStudentsPanelProps) {
  const addStudent = useAddClassroomStudent(classroomId);
  const removeStudent = useRemoveClassroomStudent(classroomId);
  const pending = addStudent.isPending || removeStudent.isPending;
  const [error, setError] = React.useState<string | undefined>();
  const [filter, setFilter] = React.useState("");

  const enrolledIds = new Set(students.map((s) => s.studentId));
  const candidates = assignableStudents.filter((s) => !enrolledIds.has(s.id));
  const term = filter.trim().toLowerCase();
  const filtered = term ? candidates.filter((s) => `${s.firstName} ${s.lastName} ${s.dni}`.toLowerCase().includes(term)) : candidates;

  async function handleAdd(studentId: string) {
    if (pending) return;
    setError(undefined);
    try {
      await addStudent.mutateAsync(studentId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRemove(studentId: string) {
    if (pending) return;
    setError(undefined);
    try {
      await removeStudent.mutateAsync(studentId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const columns: DataTableColumn<StudentMembership>[] = [
    { key: "name", header: "Nombre", render: (row) => `${row.firstName} ${row.lastName}` },
    { key: "dni", header: "DNI" },
    {
      key: "action",
      header: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleRemove(row.studentId)} disabled={pending}>
          Quitar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      <div>
        <div style={SECTION_LABEL_STYLE}>Enrolados ({students.length})</div>
        {students.length === 0 ? (
          <div style={{ color: "var(--text-muted)" }}>Sin estudiantes enrolados todavía.</div>
        ) : (
          <DataTable columns={columns} rows={students} />
        )}
      </div>

      <div>
        <div style={SECTION_LABEL_STYLE}>Agregar estudiante</div>
        <Input placeholder="Buscar por nombre o DNI" value={filter} onChange={(e) => setFilter(e.target.value)} disabled={pending} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 240, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {candidates.length === 0 ? "No hay estudiantes activos disponibles para agregar." : "Sin resultados."}
            </span>
          ) : (
            filtered.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span>
                  {s.firstName} {s.lastName} <span style={{ color: "var(--text-muted)" }}>· {s.dni}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => handleAdd(s.id)} disabled={pending}>
                  Agregar
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
