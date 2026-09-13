import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContentTree } from "@/server/classrooms/content/queries";
import { CourseViewer } from "@/components/student/content/CourseViewer";

interface ClassroomHeaderRow {
  id: number;
  name: string;
  level: string;
  program: { name: string } | null;
}

/**
 * El header "hero" (breadcrumb + nombre grande + docente + descripción) se retiró en el rediseño
 * LMS: CourseViewer ahora es dueño de su propio header compacto (nombre, programa/nivel,
 * progreso) para poder ocupar el alto disponible del panel de contenido. Por eso ya no se
 * necesitan `description`/`schedule_notes` ni el RPC de nombre de docente -- se retiraron del
 * select/Promise.all en vez de dejarlos sin usar.
 */
export default async function StudentClassroomDetailPage({ params }: { params: { id: string } }) {
  const classroomId = Number(params.id);
  if (!Number.isFinite(classroomId)) notFound();

  const supabase = createClient();
  // RLS (classrooms_select, 0015) ya devuelve null si este estudiante no está enrolado en el
  // salón (o el salón está archivado) -- no hace falta ningún chequeo adicional aquí.
  const [{ data: classroom }, modules] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, level, program:programs(name)")
      .eq("id", classroomId)
      .maybeSingle()
      .returns<ClassroomHeaderRow | null>(),
    getContentTree(supabase, classroomId),
  ]);

  if (!classroom) notFound();

  return (
    <CourseViewer classroomName={classroom.name} programName={classroom.program?.name ?? null} level={classroom.level} modules={modules} />
  );
}
