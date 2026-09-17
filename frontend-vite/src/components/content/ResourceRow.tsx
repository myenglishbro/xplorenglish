import { Icon } from "@/components/ui/core/Icon";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { ResourceFormButton } from "./ResourceFormButton";
import { detectKnownProvider } from "@/lib/resources/providers";
import { useUpdateResource, useDeleteResource } from "@/features/content/hooks";
import type { ResourceItem } from "@/server/classrooms/content/types";

const PROVIDER_ICON: Record<string, string> = {
  youtube: "video-camera",
  vimeo: "video-camera",
  drive: "file-text",
  docs: "file-text",
  slides: "file-text",
};

export function ResourceRow({ classroomId, resource }: { classroomId: number; resource: ResourceItem }) {
  const updateMutation = useUpdateResource(classroomId);
  const deleteMutation = useDeleteResource(classroomId);
  const detected = detectKnownProvider(resource.reference);
  const icon = detected ? PROVIDER_ICON[detected.type] : "link-simple";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 12px",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Icon name={icon} size={14} color="var(--text-muted)" />
        <span
          style={{
            font: "var(--weight-medium) var(--text-body-sm-size)/1.3 var(--font-body)",
            color: "var(--text-heading)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {resource.title}
        </span>
        <span
          style={{
            font: "var(--weight-regular) var(--text-caption-size)/1 var(--font-body)",
            color: "var(--text-subtle)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 220,
          }}
        >
          {resource.reference}
        </span>
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
        <ResourceFormButton
          modalTitle="Editar recurso"
          triggerLabel="Editar"
          triggerVariant="ghost"
          triggerSize="sm"
          defaultTitle={resource.title}
          defaultReference={resource.reference}
          onSubmit={(input) => updateMutation.mutateAsync({ resourceId: resource.id, input })}
        />
        <ConfirmActionButton
          label="Eliminar"
          icon="trash"
          variant="ghost"
          size="sm"
          confirmTitle="Eliminar recurso"
          confirmDescription={`Se eliminará "${resource.title}". Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          action={async () => {
            try {
              await deleteMutation.mutateAsync(resource.id);
              return {};
            } catch (err) {
              return { error: err instanceof Error ? err.message : "No pudimos eliminar el recurso. Inténtalo de nuevo en unos minutos." };
            }
          }}
        />
      </span>
    </div>
  );
}
