"use client";

import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";

export interface TempPasswordRevealProps {
  password: string;
  /** Contexto para el título de la advertencia -- "creó" al crear un estudiante, "regeneró" al resetear. */
  label?: string;
}

/**
 * Muestra una contraseña temporal exactamente una vez (no se persiste en ningún lado más allá
 * de esta prop, que a su vez viene del valor de retorno en memoria de la Server Action que la
 * generó). Usado tanto al crear un estudiante como al regenerar su contraseña.
 */
export function TempPasswordReveal({ password, label = "Contraseña temporal" }: TempPasswordRevealProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API puede fallar (permisos, contexto no seguro): el admin igual puede
      // seleccionar el texto manualmente. No es un error que deba bloquear nada.
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Alert tone="warning" title="Esta contraseña no se volverá a mostrar">
        Cópiala ahora y entrégasela al estudiante por un canal seguro. Si la pierdes, tendrás que
        generar una nueva desde el perfil del estudiante.
      </Alert>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <code
          style={{
            flex: 1,
            font: "var(--weight-semibold) 16px/1.4 monospace",
            color: "var(--text-heading)",
            wordBreak: "break-all",
          }}
        >
          {password}
        </code>
        <Button type="button" variant="secondary" icon={copied ? "check" : "copy"} onClick={handleCopy}>
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}
