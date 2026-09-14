import { useParams } from "react-router-dom";
import { useClassroomHeader, useContentTree } from "@/features/content/hooks";
import { CourseViewer } from "@/components/student/content/CourseViewer";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";

/**
 * Compartida por /teacher/salones/:id y /student/salones/:id. FASE 2/3: solo lectura (vista de
 * materiales vía CourseViewer, portado de student/content/CourseViewer.tsx) -- el editor de
 * contenido (ContentTree, crear/editar/borrar módulo/lección/recurso) que la página de Next para
 * teacher usaba queda deferido, ver reporte final de la migración. RLS (classrooms_select) ya
 * devuelve null si este usuario no tiene acceso al salón -- no hace falta chequeo adicional.
 */
export function SalonDetailPage({ role }: { role: "teacher" | "student" }) {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);

  const headerQuery = useClassroomHeader(role, classroomId);
  const contentQuery = useContentTree(classroomId);

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

  return (
    <CourseViewer
      classroomName={headerQuery.data.name}
      programName={headerQuery.data.programName}
      level={headerQuery.data.level}
      modules={contentQuery.data ?? []}
      backTo={role === "teacher" ? "/teacher/salones" : "/student/salones"}
      backLabel={role === "teacher" ? "Volver a Mis salones" : undefined}
    />
  );
}
