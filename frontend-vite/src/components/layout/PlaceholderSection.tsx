import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";

export interface PlaceholderSectionProps {
  title: string;
  icon?: string;
}

// Contenido de las rutas internas que todavía no tienen lógica de negocio -- solo
// routing/guards/shell en este bloque. Sección "en construcción" con el Design System.
export function PlaceholderSection({ title, icon = "hammer" }: PlaceholderSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
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
      <Card>
        <EmptyState icon={icon} title="Sección en construcción">
          Esta pantalla todavía no tiene funcionalidad implementada.
        </EmptyState>
      </Card>
    </div>
  );
}
