import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContentTree } from "@/server/classrooms/content/queries";
import { Icon } from "@/components/ui/core/Icon";
import { ContentTree } from "@/components/classrooms/content/ContentTree";

interface ClassroomHeaderRow {
  id: number;
  name: string;
}

export default async function AdminClassroomContentPage({ params }: { params: { id: string } }) {
  const classroomId = Number(params.id);
  if (!Number.isFinite(classroomId)) notFound();

  const supabase = createClient();
  // Esta página solo usa classroom.name (breadcrumb + título) -- getClassroomDetail() traía
  // además todo el roster de docentes/estudiantes (y, para resolver nombres de docente,
  // fetchProfileNames()) que acá nunca se muestra. Se reemplaza por un select mínimo de solo
  // los 2 campos que se usan; RLS (classrooms_select, 0015) sigue siendo la misma, así que el
  // comportamiento de "no existe o no es accesible" (null -> notFound()) no cambia. Independiente
  // de getContentTree -- ambas solo necesitan classroomId -- se lanzan en paralelo.
  const [{ data: classroom }, modules] = await Promise.all([
    supabase.from("classrooms").select("id, name").eq("id", classroomId).maybeSingle().returns<ClassroomHeaderRow | null>(),
    getContentTree(supabase, classroomId),
  ]);
  if (!classroom) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href={`/admin/salones/${classroomId}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a {classroom.name}
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          Contenido — {classroom.name}
        </h1>
      </div>

      <ContentTree classroomId={classroomId} modules={modules} editable />
    </div>
  );
}
