import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useClassroomHeader, useContentTree } from "@/features/content/hooks";
import { useClassroomPeople } from "@/features/classroomOverview/hooks";
import { useClassroomBalance } from "@/features/classRecords/hooks";
import { ClassroomInfoCard } from "@/features/classroomOverview/components/ClassroomInfoCard";
import { ClassroomClassesSection } from "@/features/classRecords/components/ClassroomClassesSection";
import { CourseViewer } from "@/components/student/content/CourseViewer";
import { ContentEditor } from "@/components/content/ContentEditor";
import { Card } from "@/components/ui/surfaces/Card";
import { Icon } from "@/components/ui/core/Icon";
import { Tag } from "@/components/ui/core/Tag";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import type { ModuleItem } from "@/server/classrooms/content/types";

type StudentTab = "contenido" | "info";

/**
 * Slice F.1: la vista Student de un salón se separa en 2 pestañas para que el contenido del curso
 * (antes enterrado al final de la página) sea lo primero que se ve:
 *  - "Contenido" (default): CourseViewer, sin cambios de fondo -- solo recibe el control de tabs en
 *    su propio header compacto (headerActions) para no duplicar un segundo header encima.
 *  - "Información del salón": lo que antes vivía siempre visible (profesores, horario, saldo,
 *    historial completo) -- sigue existiendo íntegro, solo movido a una pestaña aparte.
 * Esto es exclusivo de Student; Teacher/Admin no se tocan.
 */
function StudentSalonView({
  classroomId,
  classroomName,
  programName,
  level,
  modules,
  hasStudent,
}: {
  classroomId: number;
  classroomName: string;
  programName: string | null;
  level: string;
  modules: ModuleItem[];
  hasStudent: boolean;
}) {
  const [tab, setTab] = React.useState<StudentTab>("contenido");
  const balanceQuery = useClassroomBalance(classroomId);

  const tabsControl = (
    <Tabs
      items={[
        { value: "contenido", label: "Contenido" },
        { value: "info", label: "Información del salón" },
      ]}
      value={tab}
      onChange={(v) => setTab(v as StudentTab)}
    />
  );

  if (tab === "contenido") {
    return (
      <CourseViewer
        classroomName={classroomName}
        programName={programName}
        level={level}
        modules={modules}
        backTo="/student/salones"
        headerActions={
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
            {balanceQuery.data !== undefined && balanceQuery.data !== null && (
              <Tag tone="neutral">{balanceQuery.data} min</Tag>
            )}
            {tabsControl}
          </div>
        }
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/student/salones"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Mis salones
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          {classroomName}
        </h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-muted)" }}>
          {programName ?? "—"} · Nivel {level}
        </p>
        {tabsControl}
      </div>

      <ClassroomInfoCard classroomId={classroomId} role="student" />
      <ClassroomClassesSection classroomId={classroomId} hasStudent={hasStudent} role="student" />
    </div>
  );
}

/**
 * Compartida por /teacher/salones/:id y /student/salones/:id. Slice F agrega, para ambos roles,
 * las secciones "Datos generales" (estudiante/profesores/horario) y "Clases" (saldo, Registrar
 * clase -- solo Teacher, y el historial de class_records). El contenido del curso sigue siendo
 * responsabilidad exclusiva de features/content (dominio aparte, sin tocar en este slice).
 * Slice F.1: SOLO la composición visual de Student cambia (ver StudentSalonView) -- Teacher/Admin
 * conservan exactamente el layout de Slice F.
 */
export function SalonDetailPage({ role }: { role: "teacher" | "student" }) {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const { user } = useAuth();

  const headerQuery = useClassroomHeader(role, classroomId);
  const contentQuery = useContentTree(classroomId);
  const peopleQuery = useClassroomPeople(classroomId);

  const isLoading = headerQuery.isLoading || contentQuery.isLoading;
  const isError = headerQuery.isError || contentQuery.isError;

  if (!Number.isFinite(classroomId)) {
    return <Alert tone="danger">Salón inválido.</Alert>;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando salón…" />
      </div>
    );
  }

  if (isError || !headerQuery.data) {
    return <Alert tone="danger">No pudimos cargar este salón (o no tienes acceso). Vuelve a Mis salones.</Alert>;
  }

  const hasStudent = !!peopleQuery.data?.studentId;

  if (role === "student") {
    return (
      <StudentSalonView
        classroomId={classroomId}
        classroomName={headerQuery.data.name}
        programName={headerQuery.data.programName}
        level={headerQuery.data.level}
        modules={contentQuery.data ?? []}
        hasStudent={hasStudent}
      />
    );
  }

  const classroom = headerQuery.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/teacher/salones"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Mis salones
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          {classroom.name}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
          {classroom.programName ?? "—"} · Nivel {classroom.level}
        </p>
      </div>

      <ClassroomInfoCard classroomId={classroomId} role="teacher" />

      <ClassroomClassesSection classroomId={classroomId} hasStudent={hasStudent} role="teacher" currentTeacherId={user?.id} />

      <Card
        header={
          <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
            Contenido del salón
          </h2>
        }
      >
        <ContentEditor classroomId={classroomId} modules={contentQuery.data ?? []} />
      </Card>
    </div>
  );
}
