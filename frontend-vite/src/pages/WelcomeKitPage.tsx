import { InstitutionalDocumentsPage } from "@/pages/InstitutionalDocumentsPage";

/**
 * "Welcome Kit" -- mismo patrón que Test de nivel/Políticas (institutional_documents,
 * document_type="welcome_kit"), Teacher SIN ACCESO (ni ruta, ni nav, ni RLS -- ver
 * 0043_institutional_documents_welcome_kit.sql). Admin gestiona+ve, Student ve solo lo publicado.
 */
export function WelcomeKitPage() {
  return (
    <InstitutionalDocumentsPage
      documentType="welcome_kit"
      title="Welcome Kit"
      description="Recursos de bienvenida para estudiantes de Xplore English."
      emptyStateLabel="Sin recursos de bienvenida todavía"
      addLabel="+ Agregar recurso"
    />
  );
}
