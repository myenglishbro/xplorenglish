import { Alert } from "@/components/ui/feedback/Alert";

export function SectionError() {
  return (
    <Alert tone="danger" title="No se pudo cargar esta sección">
      Intenta recargar la página. Si el problema continúa, contacta a soporte técnico.
    </Alert>
  );
}
