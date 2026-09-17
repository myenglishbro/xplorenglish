import React from "react";
import { useAuth } from "@/auth/useAuth";
import { useInstitutionalDocuments, useAdminInstitutionalDocuments } from "@/features/institutionalDocuments/hooks";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { DocumentList } from "@/components/institutionalDocuments/DocumentList";
import { DocumentManager } from "@/components/institutionalDocuments/DocumentManager";
import { DocumentViewerModal } from "@/components/institutionalDocuments/DocumentViewerModal";
import type { InstitutionalDocumentItem, InstitutionalDocumentType } from "@/server/institutionalDocuments/types";

/**
 * Página genérica reutilizada por "Políticas y reglamentos", "Lineamientos docentes" y "Test de
 * nivel" -- las 3 secciones comparten exactamente la misma tabla/patrón/componentes
 * (institutional_documents, ver server/institutionalDocuments), solo cambia documentType, textos
 * y qué roles llegan a la ruta (eso lo decide app/router.tsx vía ProtectedRoute, no esta página).
 * Admin ve gestión completa (DocumentManager); el resto ve solo lectura de lo publicado
 * (DocumentList).
 */
export function InstitutionalDocumentsPage({
  documentType,
  title,
  description,
  emptyStateLabel,
  addLabel,
}: {
  documentType: InstitutionalDocumentType;
  title: string;
  description: string;
  emptyStateLabel?: string;
  addLabel?: string;
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const publishedQuery = useInstitutionalDocuments(documentType);
  const adminQuery = useAdminInstitutionalDocuments(documentType);
  // Admin usa su propia query (ve también sin publicar); Teacher/Student solo la de publicados.
  // Ambos hooks siempre se llaman (reglas de hooks) -- el que no aplica al rol actual simplemente
  // no se usa para render.
  const query = isAdmin ? adminQuery : publishedQuery;

  const [selected, setSelected] = React.useState<InstitutionalDocumentItem | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{description}</p>
      </div>

      {query.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : query.isError || !query.data ? (
        <Alert tone="danger">No pudimos cargar los documentos. Recarga la página para intentarlo de nuevo.</Alert>
      ) : isAdmin ? (
        <DocumentManager items={query.data} documentType={documentType} onView={setSelected} emptyStateLabel={emptyStateLabel} addLabel={addLabel} />
      ) : (
        <DocumentList items={query.data} onSelect={setSelected} />
      )}

      <DocumentViewerModal document={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
