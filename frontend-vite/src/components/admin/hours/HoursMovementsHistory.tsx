import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { AdminHoursMovementItem } from "@/server/admin/hours/types";

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  refund: "Reembolso",
  adjustment: "Ajuste",
  expiration: "Vencimiento",
};

/** Ledger crudo, solo lectura -- cada fila es un hecho ya registrado (create_hour_package /
 * register_class / correct_class), nunca algo que esta pantalla calcule o permita editar. */
export function HoursMovementsHistory({ movements }: { movements: AdminHoursMovementItem[] }) {
  if (movements.length === 0) {
    return (
      <EmptyState icon="clock-counter-clockwise" title="Sin movimientos todavía">
        Los movimientos aparecerán aquí cuando se compre un paquete o se facture una clase.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {movements.map((movement) => (
        <div
          key={movement.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                font: "var(--weight-bold) var(--text-body-sm-size)/1.3 var(--font-body)",
                color: movement.minutesDelta > 0 ? "var(--green-600)" : "var(--text-heading)",
              }}
            >
              {movement.minutesDelta > 0 ? "+" : ""}
              {movement.minutesDelta} min
            </span>
            <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
              {MOVEMENT_TYPE_LABEL[movement.movementType] ?? movement.movementType}
            </span>
            {movement.packageLabel && <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>{movement.packageLabel}</span>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>
              {formatShortDateInLima(movement.createdAt)} {formatTimeInLima(movement.createdAt)} · {movement.createdByName}
            </div>
            {movement.notes && <div style={{ color: "var(--text-body)", fontSize: "var(--text-caption-size)" }}>{movement.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
