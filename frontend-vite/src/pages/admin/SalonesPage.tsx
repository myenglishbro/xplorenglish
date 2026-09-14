import { Link, useSearchParams } from "react-router-dom";
import { useClassrooms } from "@/features/classroomsAdmin/hooks";
import { useProgramsPanel } from "@/features/programs/hooks";
import { usePrograms } from "@/features/users/hooks";
import { ACADEMIC_LEVELS, type AcademicLevel } from "@/server/admin/users/types";
import type { ClassroomStatus } from "@/server/admin/classrooms/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { SalonesTabs } from "@/components/admin/classrooms/SalonesTabs";
import { ClassroomsFilterBar } from "@/components/admin/classrooms/ClassroomsFilterBar";
import { ClassroomsTable } from "@/components/admin/classrooms/ClassroomsTable";
import { ProgramsPanel } from "@/components/admin/programs/ProgramsPanel";

const VALID_LEVELS: AcademicLevel[] = ACADEMIC_LEVELS;
const VALID_STATUSES: ClassroomStatus[] = ["active", "archived"];

/** Portado de src/app/admin/salones/page.tsx -- dos pestañas (Salones/Programas) por searchParam
 * "tab", igual criterio que el resto de filtros vía URL. */
export function SalonesPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "programas" ? "programas" : "salones";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Salones
        </h1>
        {tab === "salones" && (
          <Link to="/admin/salones/nuevo">
            <Button variant="primary" icon="plus">Crear salón</Button>
          </Link>
        )}
      </div>

      <SalonesTabs active={tab} />

      {tab === "programas" ? <ProgramsTabContent /> : <ClassroomsTabContent />}
    </div>
  );
}

function ProgramsTabContent() {
  const { data: programs, isLoading, isError } = useProgramsPanel();
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }
  if (isError || !programs) {
    return <EmptyState icon="warning" title="No pudimos cargar los programas">Recarga la página para intentarlo de nuevo.</EmptyState>;
  }
  return <ProgramsPanel programs={programs} />;
}

function ClassroomsTabContent() {
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("program") ? Number(searchParams.get("program")) : undefined;
  const level = VALID_LEVELS.includes(searchParams.get("level") as AcademicLevel) ? (searchParams.get("level") as AcademicLevel) : "all";
  const status = VALID_STATUSES.includes(searchParams.get("status") as ClassroomStatus) ? (searchParams.get("status") as ClassroomStatus) : "all";

  const classroomsQuery = useClassrooms({ programId, level, status });
  const programsQuery = usePrograms();

  if (classroomsQuery.isLoading) {
    return (
      <>
        <ClassroomsFilterBar programs={programsQuery.data ?? []} />
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      </>
    );
  }

  if (classroomsQuery.isError || !classroomsQuery.data) {
    return <EmptyState icon="warning" title="No pudimos cargar los salones">Recarga la página para intentarlo de nuevo.</EmptyState>;
  }

  const classrooms = classroomsQuery.data;

  return (
    <>
      <ClassroomsFilterBar programs={programsQuery.data ?? []} />
      <Card pad={classrooms.length === 0}>
        {classrooms.length === 0 ? (
          <EmptyState icon="chalkboard" title="Sin salones todavía">
            Crea el primero para empezar a asignar docentes y estudiantes.
          </EmptyState>
        ) : (
          <ClassroomsTable items={classrooms} />
        )}
      </Card>
    </>
  );
}
