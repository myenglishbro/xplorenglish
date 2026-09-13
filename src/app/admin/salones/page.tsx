import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listClassrooms } from "@/server/admin/classrooms/queries";
import { listProgramsForAdmin } from "@/server/admin/programs/queries";
import { listPrograms } from "@/server/admin/users/queries";
import { ACADEMIC_LEVELS, type AcademicLevel } from "@/server/admin/users/types";
import type { ClassroomStatus } from "@/server/admin/classrooms/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { SalonesTabs } from "@/components/admin/classrooms/SalonesTabs";
import { ClassroomsFilterBar } from "@/components/admin/classrooms/ClassroomsFilterBar";
import { ClassroomsTable } from "@/components/admin/classrooms/ClassroomsTable";
import { ProgramsPanel } from "@/components/admin/programs/ProgramsPanel";

const VALID_LEVELS: AcademicLevel[] = ACADEMIC_LEVELS;
const VALID_STATUSES: ClassroomStatus[] = ["active", "archived"];

export interface AdminSalonesPageProps {
  searchParams: { tab?: string; program?: string; level?: string; status?: string };
}

export default async function AdminSalonesPage({ searchParams }: AdminSalonesPageProps) {
  const tab = searchParams.tab === "programas" ? "programas" : "salones";
  const supabase = createClient();

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
          <Link href="/admin/salones/nuevo">
            <Button variant="primary" icon="plus">Crear salón</Button>
          </Link>
        )}
      </div>

      <SalonesTabs active={tab} />

      {tab === "programas" ? (
        <ProgramsPanel programs={await listProgramsForAdmin(supabase)} />
      ) : (
        <ClassroomsTabContent supabase={supabase} searchParams={searchParams} />
      )}
    </div>
  );
}

async function ClassroomsTabContent({
  supabase,
  searchParams,
}: {
  supabase: ReturnType<typeof createClient>;
  searchParams: AdminSalonesPageProps["searchParams"];
}) {
  const programId = searchParams.program ? Number(searchParams.program) : undefined;
  const level = VALID_LEVELS.includes(searchParams.level as AcademicLevel) ? (searchParams.level as AcademicLevel) : "all";
  const status = VALID_STATUSES.includes(searchParams.status as ClassroomStatus) ? (searchParams.status as ClassroomStatus) : "all";

  const [classrooms, programs] = await Promise.all([
    listClassrooms(supabase, { programId, level, status }),
    listPrograms(supabase),
  ]);

  return (
    <>
      <ClassroomsFilterBar programs={programs} />
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
