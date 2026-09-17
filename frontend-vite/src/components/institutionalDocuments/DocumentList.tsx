import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import type { InstitutionalDocumentItem } from "@/server/institutionalDocuments/types";

/** Teacher/Student -- lectura pura, ya filtrada a publicados por el hook/RLS. Sin controles
 * administrativos. Click abre el visor (ver DocumentViewerModal). */
export function DocumentList({ items, onSelect }: { items: InstitutionalDocumentItem[]; onSelect: (doc: InstitutionalDocumentItem) => void }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="file-text" title="Sin documentos publicados">
        Cuando la academia publique un documento, aparecerá acá.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {items.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => onSelect(doc)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-card)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              flex: "0 0 auto",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-accent-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="file-text" size={17} color="var(--cyan-700)" />
          </span>
          <span style={{ flex: 1, font: "var(--weight-semibold) var(--text-body-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
            {doc.title}
          </span>
          <Icon name="caret-right" size={16} color="var(--text-muted)" />
        </button>
      ))}
    </div>
  );
}
