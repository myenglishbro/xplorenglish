import { Link, useLocation, useParams } from "react-router-dom";
import { useClassroomDetail, useAssignableTeachers, useAssignableStudents, useClassroomCompatibility } from "@/features/classroomsAdmin/hooks";
import { usePrograms } from "@/features/users/hooks";
import { useClassSchedules } from "@/features/schedulingAdmin/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { ClassroomEditForm } from "@/components/admin/classrooms/ClassroomEditForm";
import { ClassroomStatusToggle } from "@/components/admin/classrooms/ClassroomStatusToggle";
import { ClassroomTeachersPanel } from "@/components/admin/classrooms/ClassroomTeachersPanel";
import { ClassroomStudentsPanel } from "@/components/admin/classrooms/ClassroomStudentsPanel";
import { WeeklyScheduleList } from "@/components/admin/scheduling/WeeklyScheduleList";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/** Portado de src/app/admin/salones/[id]/page.tsx. El botón "Ver contenido" (gestión de módulos
 * de contenido del salón) queda deliberadamente fuera de este pase -- ver informe final. */
export function SalonDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const location = useLocation();
  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);

  const classroomQuery = useClassroomDetail(classroomId);
  const programsQuery = usePrograms();
  const assignableTeachersQuery = useAssignableTeachers();
  const assignableStudentsQuery = useAssignableStudents();
  // Misma lista que ya trae assignableTeachersQuery -- se le pasa tal cual, así
  // getClassroomTeacherCompatibility ya no vuelve a pedir teacher_profiles por su cuenta
  // (performance slice 1). Queda deshabilitada hasta que esa lista llegue (ver hooks.ts).
  const compatibilityQuery = useClassroomCompatibility(classroomId, assignableTeachersQuery.data);
  const classSchedulesQuery = useClassSchedules(classroomId);

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
  const compatibility = compatibilityQuery.data ?? { hasActiveSchedules: false, schedules: [], teachers: [] };
  const schedules = classSchedulesQuery.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {justCreated && (
        <Alert tone="info">Ahora configura el horario semanal y asigna el docente titular.</Alert>
      )}

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos del salón")}>
          <ClassroomEditForm classroom={classroom} programs={programs} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Card header={cardTitle("Estado")}>
            <ClassroomStatusToggle classroomId={classroom.id} status={classroom.status} />
            <p style={{ marginTop: "var(--space-3)", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
              Archivar no borra ni desactiva a los docentes ni estudiantes asignados -- solo oculta el salón de sus listados. Al reactivarlo, sus miembros activos recuperan acceso automáticamente.
            </p>
          </Card>

          <Card header={cardTitle("Horario semanal")}>
            <WeeklyScheduleList classroomId={classroom.id} schedules={schedules} />
          </Card>

          <Card header={cardTitle("Docentes")}>
            <ClassroomTeachersPanel classroomId={classroom.id} teachers={classroom.teachers} assignableTeachers={assignableTeachers} compatibility={compatibility} />
          </Card>
        </div>
      </div>

      <Card header={cardTitle("Estudiantes")}>
        <ClassroomStudentsPanel classroomId={classroom.id} students={classroom.students} assignableStudents={assignableStudents} />
      </Card>
    </div>
  );
}
