import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClassroomDetail, listAssignableStudents, listAssignableTeachers } from "@/server/admin/classrooms/queries";
import { listPrograms } from "@/server/admin/users/queries";
import { getClassroomTeacherCompatibility } from "@/server/scheduling/compatibility";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";
import { ClassroomEditForm } from "@/components/admin/classrooms/ClassroomEditForm";
import { ClassroomStatusToggle } from "@/components/admin/classrooms/ClassroomStatusToggle";
import { ClassroomTeachersPanel } from "@/components/admin/classrooms/ClassroomTeachersPanel";
import { ClassroomStudentsPanel } from "@/components/admin/classrooms/ClassroomStudentsPanel";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

export default async function AdminClassroomDetailPage({ params }: { params: { id: string } }) {
  const classroomId = Number(params.id);
  if (!Number.isFinite(classroomId)) notFound();

  const supabase = createClient();
  // Las cargas son independientes; la compatibilidad solo necesita el id de la URL.
  const [classroom, programs, assignableTeachers, assignableStudents, compatibility] = await Promise.all([
    getClassroomDetail(supabase, classroomId),
    listPrograms(supabase),
    listAssignableTeachers(supabase),
    listAssignableStudents(supabase),
    getClassroomTeacherCompatibility(supabase, classroomId),
  ]);
  if (!classroom) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/admin/salones"
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
          <Link href={`/admin/salones/${classroom.id}/contenido`} style={{ marginLeft: "auto" }}>
            <Button variant="accent" icon="books">Ver contenido</Button>
          </Link>
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
