import { Link, useLocation, useParams } from "react-router-dom";
import { useClassroomDetail, useAssignableTeachers, useAssignableStudents } from "@/features/classroomsAdmin/hooks";
import { usePrograms } from "@/features/users/hooks";
import { useClassSchedules } from "@/features/schedulingAdmin/hooks";
import { useContentTree } from "@/features/content/hooks";
import { ClassroomClassesSection } from "@/features/classRecords/components/ClassroomClassesSection";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { ClassroomEditForm } from "@/components/admin/classrooms/ClassroomEditForm";
import { ClassroomStatusToggle } from "@/components/admin/classrooms/ClassroomStatusToggle";
import { ClassroomTeachersPanel } from "@/components/admin/classrooms/ClassroomTeachersPanel";
import { ClassroomStudentPanel } from "@/components/admin/classrooms/ClassroomStudentPanel";
import { WeeklyScheduleList } from "@/components/admin/scheduling/WeeklyScheduleList";
import { ContentEditor } from "@/components/content/ContentEditor";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/**
 * Detalle Admin de salón (Slice F) -- modelo nuevo: classrooms.student_id (un solo alumno),
 * classroom_teachers sin PRIMARY/SUBSTITUTE ("profesores habilitados"), class_schedules como
 * horario referencial, e historial de class_records (solo lectura -- Admin no registra/corrige
 * clases en este slice).
 */
export function SalonDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const location = useLocation();
  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);

  const classroomQuery = useClassroomDetail(classroomId);
  const programsQuery = usePrograms();
  const assignableTeachersQuery = useAssignableTeachers();
  const assignableStudentsQuery = useAssignableStudents();
  const classSchedulesQuery = useClassSchedules(classroomId);
  const contentQuery = useContentTree(classroomId);

  if (!Number.isFinite(classroomId)) {
    return <EmptyState icon="warning" title="Este salón no existe">Vuelve al listado de Salones.</EmptyState>;
  }

  if (classroomQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  const classroom = classroomQuery.data;
  if (classroomQuery.isError || !classroom) {
    return <EmptyState icon="warning" title="Este salón no existe">Vuelve al listado de Salones.</EmptyState>;
  }

  const programs = programsQuery.data ?? [];
  const assignableTeachers = assignableTeachersQuery.data ?? [];
  const assignableStudents = assignableStudentsQuery.data ?? [];
  const schedules = classSchedulesQuery.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {justCreated && <Alert tone="info">Ahora configura el horario semanal, asigna el estudiante y habilita profesores.</Alert>}

      <div>
        <Link
          to="/admin/salones"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Salones
        </Link>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {classroom.name}
          </h1>
          <Tag tone="neutral">{classroom.level}</Tag>
          <Tag tone={classroom.status === "active" ? "success" : "neutral"}>{classroom.status === "active" ? "Activo" : "Archivado"}</Tag>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos del salón")}>
          <ClassroomEditForm classroom={classroom} programs={programs} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Card header={cardTitle("Estado")}>
            <ClassroomStatusToggle classroomId={classroom.id} status={classroom.status} />
            <p style={{ marginTop: "var(--space-3)", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
              Archivar no borra ni desactiva al estudiante ni a los profesores asignados -- solo oculta el salón de sus listados.
            </p>
          </Card>

          <Card header={cardTitle("Horario semanal")}>
            <WeeklyScheduleList classroomId={classroom.id} schedules={schedules} />
          </Card>

          <Card header={cardTitle("Profesores habilitados")}>
            <ClassroomTeachersPanel classroomId={classroom.id} teachers={classroom.teachers} assignableTeachers={assignableTeachers} />
          </Card>
        </div>
      </div>

      <Card header={cardTitle("Estudiante")}>
        <ClassroomStudentPanel classroomId={classroom.id} student={classroom.student} assignableStudents={assignableStudents} />
      </Card>

      <div>
        {cardTitle("Clases")}
        <div style={{ marginTop: "var(--space-3)" }}>
          <ClassroomClassesSection classroomId={classroom.id} hasStudent={!!classroom.student} role="admin" />
        </div>
      </div>

      <Card header={cardTitle("Contenido del salón")}>
        {contentQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
            <Spinner size={24} label="Cargando contenido…" />
          </div>
        ) : (
          <ContentEditor classroomId={classroom.id} modules={contentQuery.data ?? []} />
        )}
      </Card>
    </div>
  );
}
