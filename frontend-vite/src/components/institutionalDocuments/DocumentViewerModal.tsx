import { Modal } from "@/components/ui/surfaces/Modal";
import { ResourceRenderer } from "@/components/student/content/ResourceRenderer";
import type { InstitutionalDocumentItem } from "@/server/institutionalDocuments/types";

/**
 * Visor de un documento institucional -- reutiliza ResourceRenderer tal cual (detección de
 * proveedor + iframe + fallback "abrir en nueva pestaña"), la misma experiencia que un recurso de
 * salón. Un solo documento renderizado a la vez (nunca todos los iframes juntos, ver
 * PoliciesPage: la lista no renderiza el visor hasta que se selecciona un documento).
 */
export function DocumentViewerModal({ document, onClose }: { document: InstitutionalDocumentItem | null; onClose: () => void }) {
  return (
    <Modal open={!!document} onClose={onClose} title={document?.title} width={760}>
      {document && <ResourceRenderer resource={{ title: document.title, reference: document.url }} />}
    </Modal>
  );
}
