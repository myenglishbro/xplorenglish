import { InstitutionalDocumentsPage } from "@/pages/InstitutionalDocumentsPage";

/**
 * "Lineamientos docentes" -- mismo patrón que Políticas y reglamentos (institutional_documents,
 * document_type="teacher_guideline"), pero Student SIN ACCESO: no aparece en su sidebar y RLS
 * (0039_institutional_documents_types.sql) impide la lectura aunque intente entrar por URL.
 * Admin gestiona+ve, Teacher solo ve lo publicado.
 */
export function TeacherGuidelinesPage() {
  return (
    <InstitutionalDocumentsPage
      documentType="teacher_guideline"
      title="Lineamientos docentes"
      description="Guías y disposiciones para el equipo docente de Xplore English."
      emptyStateLabel="Sin lineamientos todavía"
      addLabel="+ Agregar lineamiento"
    />
  );
}
