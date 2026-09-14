import { Tag } from "@/components/ui/core/Tag";

export interface TeacherAssignmentProps {
  scheduledTeacherId: string;
  scheduledTeacherName: string;
  actualTeacherId: string | null;
  actualTeacherName: string | null;
}

/** "Programado: X" siempre; "Real: Y" + tag "Sustituto" solo cuando actual_teacher_id existe Y
 * difiere del programado -- comparación por id, nunca por nombre (dos docentes pueden compartir
 * nombre). Ver auditoría: scheduled_teacher_id/actual_teacher_id son capas independientes. */
export function TeacherAssignment({ scheduledTeacherId, scheduledTeacherName, actualTeacherId, actualTeacherName }: TeacherAssignmentProps) {
  const differs = actualTeacherId !== null && actualTeacherId !== scheduledTeacherId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-body)" }}>
        {scheduledTeacherName}
      </span>
      {differs && (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
            Real: {actualTeacherName}
          </span>
          <Tag tone="accent" size="sm">
            Sustituto
          </Tag>
        </span>
      )}
    </div>
  );
}
