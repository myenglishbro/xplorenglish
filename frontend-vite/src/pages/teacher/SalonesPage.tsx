import React from "react";
import { useClassroomTeachersCards, useMyClassroomsAsTeacher } from "@/features/classrooms/hooks";
import { ClassroomCard, ClassroomCardSkeletons, ClassroomCardStyles, GRID_STYLE } from "@/components/classrooms/ClassroomCard";
import { Card } from "@/components/ui/surfaces/Card";
import { Input } from "@/components/ui/forms/Input";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";

const SEARCH_THRESHOLD = 6;

export function TeacherSalonesPage() {
  const { data: classrooms, isLoading, isError } = useMyClassroomsAsTeacher();
  const [search, setSearch] = React.useState("");
  const teachersQuery = useClassroomTeachersCards((classrooms ?? []).map((c) => c.id));

  const q = search.trim().toLowerCase();
  const filtered = (classrooms ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.programName.toLowerCase().includes(q) || c.level.toLowerCase().includes(q));
  const total = classrooms?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <ClassroomCardStyles />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-3)" }}>
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
              {total} {total === 1 ? "salón activo" : "salones activos"}
            </p>
          )}
        </div>
        {total > SEARCH_THRESHOLD && (
          <div style={{ width: "min(320px, 100%)" }}>
            <Input icon="magnifying-glass" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar salón…" />
          </div>
        )}
      </div>

      {isLoading ? (
        <ClassroomCardSkeletons />
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar tus salones. Recarga la página.</Alert>
      ) : total === 0 ? (
        <Card>
          <EmptyState icon="chalkboard" title="Todavía no tienes salones asignados">
            Cuando el admin te asigne como titular o suplente de un salón, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon="magnifying-glass" title="Sin resultados">
          Ningún salón coincide con "{search}".
        </EmptyState>
      ) : (
        <div style={GRID_STYLE}>
          {filtered.map((c, i) => (
            <ClassroomCard key={c.id} to={`/teacher/salones/${c.id}`} name={c.name} level={c.level} programName={c.programName} description={c.description} scheduleNotes={c.scheduleNotes} teachers={teachersQuery.data?.get(c.id)} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
