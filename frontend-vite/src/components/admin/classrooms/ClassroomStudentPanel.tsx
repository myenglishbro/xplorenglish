import React from "react";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useSetClassroomStudent } from "@/features/classroomsAdmin/hooks";
import type { AssignableStudent, ClassroomStudent } from "@/server/admin/classrooms/types";

export interface ClassroomStudentPanelProps {
  classroomId: number;
  student: ClassroomStudent | null;
  assignableStudents: AssignableStudent[];
}

/**
 * Estudiante del salón (Slice F) -- exactamente classrooms.student_id, un solo alumno o NULL
 * (nunca classroom_students). Cambiarlo NUNCA modifica class_records históricos: esos conservan su
 * propio student_id snapshot tomado al registrar cada clase.
 */
export function ClassroomStudentPanel({ classroomId, student, assignableStudents }: ClassroomStudentPanelProps) {
  const setStudent = useSetClassroomStudent(classroomId);
  const [error, setError] = React.useState<string | undefined>();
  const [filter, setFilter] = React.useState("");

  const term = filter.trim().toLowerCase();
  const filtered = term ? assignableStudents.filter((s) => `${s.firstName} ${s.lastName} ${s.dni}`.toLowerCase().includes(term)) : assignableStudents;

  async function handleAssign(studentId: string) {
    if (setStudent.isPending) return;
    setError(undefined);
    try {
      await setStudent.mutateAsync(studentId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleClear() {
    if (setStudent.isPending) return;
    setError(undefined);
    try {
      await setStudent.mutateAsync(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      {student ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            {student.firstName} {student.lastName} <span style={{ color: "var(--text-muted)" }}>· {student.dni}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={setStudent.isPending}>
            Quitar
          </Button>
        </div>
      ) : (
        <Alert tone="warning">Sin estudiante asignado. No se podrán registrar clases PRESENTE/AUSENTE hasta asignar uno.</Alert>
      )}

      <div>
        <Input placeholder="Buscar por nombre o DNI para asignar/cambiar" value={filter} onChange={(e) => setFilter(e.target.value)} disabled={setStudent.isPending} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 200, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {assignableStudents.length === 0 ? "No hay estudiantes activos disponibles." : "Sin resultados."}
            </span>
          ) : (
            filtered
              .filter((s) => s.id !== student?.studentId)
              .map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span>
                    {s.firstName} {s.lastName} <span style={{ color: "var(--text-muted)" }}>· {s.dni}</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => handleAssign(s.id)} disabled={setStudent.isPending}>
                    {student ? "Cambiar" : "Asignar"}
                  </Button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
