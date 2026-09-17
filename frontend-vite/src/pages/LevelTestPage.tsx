import { InstitutionalDocumentsPage } from "@/pages/InstitutionalDocumentsPage";

/**
 * "Test de nivel" -- mismo patrón que Políticas y reglamentos (institutional_documents,
 * document_type="level_test"), pero Teacher SIN ACCESO. Admin coloca/edita/publica el
 * recurso/URL del test; Student lo visualiza con el mismo DocumentViewerModal/ResourceRenderer.
 * Reemplaza el placeholder de src/pages/student/TestDeNivelPage.tsx -- deliberadamente NO se
 * implementa ningún sistema nuevo de exámenes/resultados/intentos (las tablas legacy
 * placement_tests/placement_test_attempts de 0004_placement_tests.sql no se tocan ni se usan).
 */
export function LevelTestPage() {
  return (
    <InstitutionalDocumentsPage
      documentType="level_test"
      title="Test de nivel"
      description="Recurso del test de nivel de Xplore English."
      emptyStateLabel="Sin test de nivel configurado todavía"
      addLabel="+ Agregar recurso"
    />
  );
}
