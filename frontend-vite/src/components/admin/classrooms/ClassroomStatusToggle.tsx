import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { Tag } from "@/components/ui/core/Tag";
import { useSetClassroomStatus } from "@/features/classroomsAdmin/hooks";
import type { ClassroomStatus } from "@/server/admin/classrooms/types";

/**
 * Finalizar/Reactivar (UI) = classrooms.status "archived"/"active" (sin estado nuevo, ver
 * admin_set_classroom_status, 0044). Reemplaza el Switch simple anterior por una confirmación
 * explícita (ConfirmActionButton, mismo patrón que otras acciones administrativas importantes):
 * finalizar un salón activo saca al docente/estudiante de la operación diaria y bloquea el
 * registro de clases nuevas, así que merece un paso de confirmación, no un toggle silencioso.
 *
 * Sin estado local: tras un mutateAsync exitoso, useSetClassroomStatus invalida la query del
 * salón (invalidateClassroomQueries) y este componente vuelve a renderizar con el `status` real ya
 * actualizado -- nunca se asume el resultado antes de que el RPC confirme.
 */
export function ClassroomStatusToggle({ classroomId, status }: { classroomId: number; status: ClassroomStatus }) {
  const mutation = useSetClassroomStatus(classroomId);
  const isActive = status === "active";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <Tag tone={isActive ? "success" : "neutral"} size="sm">
        {isActive ? "Activo" : "Finalizado"}
      </Tag>

      {isActive ? (
        <ConfirmActionButton
          label="Finalizar salón"
          variant="secondary"
          size="sm"
          confirmTitle="Finalizar salón"
          confirmDescription="Este salón dejará de aparecer como activo para el docente y el estudiante. No se podrán registrar nuevas clases, pero el historial de clases y pagos se conservará."
          confirmLabel="Finalizar salón"
          action={async () => {
            try {
              await mutation.mutateAsync("archived");
              return {};
            } catch (err) {
              return { error: err instanceof Error ? err.message : "No pudimos finalizar el salón. Inténtalo de nuevo en unos minutos." };
            }
          }}
        />
      ) : (
        <ConfirmActionButton
          label="Reactivar salón"
          variant="secondary"
          size="sm"
          confirmTitle="Reactivar salón"
          confirmDescription="El salón volverá a estar disponible para la operación diaria y podrán registrarse nuevas clases."
          confirmLabel="Reactivar salón"
          action={async () => {
            try {
              await mutation.mutateAsync("active");
              return {};
            } catch (err) {
              return { error: err instanceof Error ? err.message : "No pudimos reactivar el salón. Inténtalo de nuevo en unos minutos." };
            }
          }}
        />
      )}
    </div>
  );
}
