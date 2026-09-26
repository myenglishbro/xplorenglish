export interface MetricBandItem {
  label: string;
  value: string;
}

/**
 * Banda compacta de métricas secundarias -- 1px de "grid gap" pintado con --border-subtle simula
 * separadores finos entre celdas sin duplicar bordes al envolver en pantallas angostas (auto-fit
 * ya reordena las celdas en filas, el gap sigue dibujando la línea divisoria correcta en cualquier
 * posición). Deliberadamente sin StatCard/icono: estas métricas son de segundo nivel, no deben
 * competir visualmente con los KPIs principales.
 */
export function MetricBand({ items }: { items: MetricBandItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 1,
        background: "var(--border-subtle)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ background: "var(--surface-card)", padding: "12px 18px" }}>
          <div style={{ font: "var(--weight-semibold) var(--text-caption-size)/1.2 var(--font-body)", color: "var(--text-muted)" }}>{it.label}</div>
          <div style={{ font: "var(--weight-bold) 18px/1.3 var(--font-display)", color: "var(--text-heading)", marginTop: 2 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
