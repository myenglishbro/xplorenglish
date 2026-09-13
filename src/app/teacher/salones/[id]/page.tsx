import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContentTree } from "@/server/classrooms/content/queries";
import { Icon } from "@/components/ui/core/Icon";
import { Tag } from "@/components/ui/core/Tag";
import { ContentTree } from "@/components/classrooms/content/ContentTree";

interface ClassroomHeaderRow {
  id: number;
  name: string;
  level: string;
  description: string | null;
  schedule_notes: string | null;
  program: { name: string } | null;
}

export default async function TeacherClassroomDetailPage({ params }: { params: { id: string } }) {
  const classroomId = Number(params.id);
  if (!Number.isFinite(classroomId)) notFound();

  const supabase = createClient();
  // RLS (classrooms_select, 0015) ya devuelve null si este docente no está asignado al salón
  // (o el salón está archivado) -- no hace falta ningún chequeo adicional aquí. getContentTree
  // no depende de este select (ambas solo necesitan classroomId) -- se lanzan en paralelo; el
  // chequeo de notFound() sigue exactamente igual, solo se evalúa después de que ambas resuelven.
  const [{ data: classroom }, modules] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, level, description, schedule_notes, program:programs(name)")
      .eq("id", classroomId)
      .maybeSingle()
      .returns<ClassroomHeaderRow | null>(),
    getContentTree(supabase, classroomId),
  ]);

  if (!classroom) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/teacher/salones"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Mis salones
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
          <Tag tone="neutral">{classroom.program?.name ?? "—"}</Tag>
          <Tag tone="neutral">Nivel {classroom.level}</Tag>
        </div>
        {classroom.description && <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>{classroom.description}</p>}
        {classroom.schedule_notes && (
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>Horario: {classroom.schedule_notes}</p>
        )}
      </div>

      <ContentTree classroomId={classroomId} modules={modules} editable />
    </div>
  );
}
