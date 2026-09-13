"use client";

import { Button } from "@/components/ui/core/Button";
import type { ResourceItem } from "@/server/classrooms/content/types";

/**
 * Renderer compacto de fila para admin/docente -- solo "Abrir" en pestaña nueva para cualquier
 * tipo. La descarga vía Storage (pdf) y el iframe en línea (embed) se retiraron: ya no se crean
 * recursos de esos tipos (ver createResourceAction), y la vista rica con embed real vive en
 * ResourceRenderer (student), no acá -- el admin solo necesita verificar el enlace.
 */
export function ResourceLink({ resource }: { resource: ResourceItem }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon="arrow-square-out"
      onClick={() => window.open(resource.reference, "_blank", "noopener,noreferrer")}
    >
      Abrir
    </Button>
  );
}
