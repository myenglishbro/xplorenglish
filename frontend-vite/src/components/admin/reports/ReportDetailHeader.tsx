import { Button } from "@/components/ui/core/Button";

/**
 * Cabecera compartida de toda vista DETAIL (rediseño UX/UI) -- "← Volver al resumen" + título,
 * mismo patrón en Ventas/Pagos docentes/Costo por docente/Otros gastos para que el administrador
 * siempre sepa si está viendo el resumen o el detalle completo.
 */
export function ReportDetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Button variant="ghost" size="sm" icon="arrow-left" onClick={onBack} style={{ alignSelf: "flex-start" }}>
        Volver al resumen
      </Button>
      <h3 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
        {title}
      </h3>
    </div>
  );
}
