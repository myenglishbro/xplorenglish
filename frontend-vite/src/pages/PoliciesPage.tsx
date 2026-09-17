import { InstitutionalDocumentsPage } from "@/pages/InstitutionalDocumentsPage";

/**
 * "Políticas y reglamentos" -- sección institucional GLOBAL, compartida por los 3 roles vía una
 * sola página: Admin ve gestión completa, Teacher/Student ven solo lectura de lo publicado.
 * Nunca pertenece a un salón/módulo/programa/nivel -- ver server/institutionalDocuments.
 */
export function PoliciesPage() {
  return (
    <InstitutionalDocumentsPage
      documentType="policy"
      title="Políticas y reglamentos"
      description="Documentos oficiales y disposiciones de Xplore English."
    />
  );
}
