"use client";

import { Card } from "@/components/ui/surfaces/Card";
import { Alert } from "@/components/ui/feedback/Alert";
import { Button } from "@/components/ui/core/Button";

export interface AdminRouteErrorProps {
  reset: () => void;
  title?: string;
}

export function AdminRouteError({ reset, title = "No se pudo cargar esta página" }: AdminRouteErrorProps) {
  return (
    <Card>
      <Alert tone="danger" title={title} action={<Button size="sm" variant="secondary" onClick={reset}>Reintentar</Button>}>
        Ocurrió un error inesperado. Intenta de nuevo; si el problema continúa, contacta a soporte técnico.
      </Alert>
    </Card>
  );
}
