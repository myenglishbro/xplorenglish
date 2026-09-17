import { Tag } from "@/components/ui/core/Tag";
import { IconButton } from "@/components/ui/core/IconButton";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import {
  useSetInstitutionalDocumentPublished,
  useDeleteInstitutionalDocument,
  useReorderInstitutionalDocument,
} from "@/features/institutionalDocuments/hooks";
import { DocumentFormButton } from "./DocumentFormButton";
import type { InstitutionalDocumentItem, InstitutionalDocumentType } from "@/server/institutionalDocuments/types";

/**
 * Gestión Admin de documentos institucionales (agregar/editar/publicar/ordenar/eliminar) -- lista
 * simple de filas, mismo patrón visual que WeeklyScheduleList (admin/scheduling). Sin
 * drag-and-drop: reordenar es un swap de sort_order con el vecino inmediato (flechas ↑/↓).
 * Reutilizado por Políticas, Lineamientos docentes y Test de nivel (documentType).
 */
export function DocumentManager({
  items,
  documentType,
  onView,
  emptyStateLabel = "Sin documentos todavía",
  addLabel = "+ Agregar documento",
}: {
  items: InstitutionalDocumentItem[];
  documentType: InstitutionalDocumentType;
  onView: (doc: InstitutionalDocumentItem) => void;
  emptyStateLabel?: string;
  addLabel?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {items.length === 0 ? (
        <EmptyState icon="file-text" title={emptyStateLabel}>
          Agrega el primero abajo.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {items.map((doc, index) => (
            <DocumentManagerRow
              key={doc.id}
              document={doc}
              documentType={documentType}
              onView={() => onView(doc)}
              previous={index > 0 ? items[index - 1] : undefined}
              next={index < items.length - 1 ? items[index + 1] : undefined}
            />
          ))}
        </div>
      )}

      <div>
        <DocumentFormButton mode="create" documentType={documentType} triggerLabel={addLabel} triggerVariant="secondary" triggerIcon="plus" />
      </div>
    </div>
  );
}

function DocumentManagerRow({
  document,
  documentType,
  onView,
  previous,
  next,
}: {
  document: InstitutionalDocumentItem;
  documentType: InstitutionalDocumentType;
  onView: () => void;
  previous?: InstitutionalDocumentItem;
  next?: InstitutionalDocumentItem;
}) {
  const setPublished = useSetInstitutionalDocumentPublished(documentType);
  const deleteDocument = useDeleteInstitutionalDocument(documentType);
  const reorder = useReorderInstitutionalDocument(documentType);

  async function handleTogglePublished(checked: boolean) {
    if (setPublished.isPending) return;
    try {
      await setPublished.mutateAsync({ id: document.id, isPublished: checked });
    } catch {
      // el error ya queda en setPublished.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-card)",
        }}
      >
        <button
          type="button"
          onClick={onView}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
            font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)",
            color: "var(--text-heading)",
          }}
        >
          {document.title}
          {!document.isPublished && (
            <Tag tone="neutral" size="sm">
              Sin publicar
            </Tag>
          )}
        </button>

        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconButton
            icon="arrow-up"
            size="sm"
            label="Mover arriba"
            disabled={!previous || reorder.isPending}
            onClick={() => previous && reorder.mutate({ current: document, neighbor: previous })}
          />
          <IconButton
            icon="arrow-down"
            size="sm"
            label="Mover abajo"
            disabled={!next || reorder.isPending}
            onClick={() => next && reorder.mutate({ current: document, neighbor: next })}
          />
          <Switch checked={document.isPublished} onChange={(e) => handleTogglePublished(e.target.checked)} disabled={setPublished.isPending} />
          <DocumentFormButton mode="edit" documentType={documentType} document={document} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" />
          <ConfirmActionButton
            label="Eliminar"
            icon="trash"
            variant="ghost"
            size="sm"
            confirmTitle="Eliminar documento"
            confirmDescription={`Se eliminará "${document.title}". Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            action={async () => {
              try {
                await deleteDocument.mutateAsync(document.id);
                return {};
              } catch (err) {
                return { error: err instanceof Error ? err.message : "No pudimos eliminar el documento. Inténtalo de nuevo en unos minutos." };
              }
            }}
          />
        </span>
      </div>
      {setPublished.isError && <Alert tone="danger">{(setPublished.error as Error).message}</Alert>}
    </div>
  );
}
