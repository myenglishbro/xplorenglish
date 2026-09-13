import { Alert } from "@/components/ui/feedback/Alert";

// El mensaje real del error se registra en el servidor (ver queries.ts / page.tsx), no
// se expone aquí: aunque esta pantalla es solo para admins, un texto de error de
// Postgres/PostgREST puede revelar detalles de esquema que no aportan nada al usuario.
export function SectionError() {
  return (
    <Alert tone="danger" title="No se pudo cargar esta sección">
      Intenta recargar la página. Si el problema continúa, contacta a soporte técnico.
    </Alert>
  );
}
