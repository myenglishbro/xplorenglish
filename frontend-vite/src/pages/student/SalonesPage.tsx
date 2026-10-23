import { useClassroomTeachersCards, useMyClassroomsAsStudent } from "@/features/classrooms/hooks";
import { ClassroomCard, ClassroomCardSkeletons, ClassroomCardStyles, GRID_STYLE } from "@/components/classrooms/ClassroomCard";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";

export function StudentSalonesPage() {
  const { data: classrooms, isLoading, isError } = useMyClassroomsAsStudent();
  const total = classrooms?.length ?? 0;
  const teachersQuery = useClassroomTeachersCards((classrooms ?? []).map((c) => c.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <ClassroomCardStyles />

      <div>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Mis salones
        </h1>
        {!isLoading && !isError && total > 0 && (
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
            {total} {total === 1 ? "salón" : "salones"}
          </p>
        )}
      </div>

      {isLoading ? (
        <ClassroomCardSkeletons />
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar tus salones. Recarga la página.</Alert>
      ) : total === 0 ? (
        <Card>
          <EmptyState icon="chalkboard" title="Todavía no estás en ningún salón">
            Cuando el admin te enrole en un salón, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <div style={GRID_STYLE}>
          {classrooms?.map((c, i) => (
            <ClassroomCard key={c.id} to={`/student/salones/${c.id}`} name={c.name} level={c.level} programName={c.programName} description={c.description} scheduleNotes={c.scheduleNotes} teachers={teachersQuery.data?.get(c.id)} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
