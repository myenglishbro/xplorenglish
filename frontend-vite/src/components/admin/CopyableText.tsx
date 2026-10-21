import React from "react";
import { Icon } from "@/components/ui/core/Icon";

export interface CopyableTextProps {
  value: string;
  /** Texto accesible del botón, p. ej. "Copiar correo". */
  label?: string;
}

/** Texto con botón para copiarlo al portapapeles. Detiene la propagación del click para no
 * disparar el onRowClick de las tablas. */
export function CopyableText({ value, label = "Copiar" }: CopyableTextProps) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number>();

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible (p. ej. contexto no seguro): el texto sigue siendo seleccionable
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "text" }}>{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copiado" : label}
        aria-label={copied ? "Copiado" : label}
        style={{
          background: "none",
          border: "none",
          padding: 2,
          cursor: "pointer",
          display: "inline-flex",
          flexShrink: 0,
          color: copied ? "var(--text-success, var(--text-brand))" : "var(--text-muted)",
        }}
      >
        <Icon name={copied ? "check" : "copy"} weight="bold" size={14} />
      </button>
    </span>
  );
}
