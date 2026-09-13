import Link from "next/link";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Button } from "@/components/ui/core/Button";

export default function AdminUserNotFound() {
  return (
    <Card>
      <EmptyState
        icon="user-circle-minus"
        title="Usuario no encontrado"
        action={
          <Link href="/admin/usuarios">
            <Button variant="secondary">Volver a Usuarios</Button>
          </Link>
        }
      >
        El usuario que buscas no existe o fue eliminado.
      </EmptyState>
    </Card>
  );
}
