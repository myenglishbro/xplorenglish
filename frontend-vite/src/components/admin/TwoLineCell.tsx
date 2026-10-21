import type { ReactNode } from "react";

export interface TwoLineCellProps {
  primary: ReactNode;
  secondary?: ReactNode;
  /** Resalta la primera línea (nombre/título de la fila); false para celdas de apoyo. */
  strong?: boolean;
}

/** Celda de tabla de dos líneas: dato principal + dato de apoyo en gris. Permite combinar columnas
 * relacionadas (nombre + correo, programa + nivel) sin perder información. */
export function TwoLineCell({ primary, secondary, strong = false }: TwoLineCellProps) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span
        style={
          strong
            ? { font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }
            : { color: "var(--text-body)" }
        }
      >
        {primary}
      </span>
      {secondary != null && secondary !== "" && (
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {secondary}
        </span>
      )}
    </span>
  );
}
