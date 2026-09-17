import React from "react";
import { Icon } from "@/components/ui/core/Icon";
import { IconButton } from "@/components/ui/core/IconButton";
import { Tag } from "@/components/ui/core/Tag";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { TitleDescriptionFormButton } from "./TitleDescriptionFormButton";
import { ResourceFormButton } from "./ResourceFormButton";
import { ResourceRow } from "./ResourceRow";
import {
  useUpdateLesson,
  useSetLessonStatus,
  useDeleteLesson,
  useCreateResource,
} from "@/features/content/hooks";
import type { LessonItem } from "@/server/classrooms/content/types";

export function LessonCard({ classroomId, lesson }: { classroomId: number; lesson: LessonItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const updateMutation = useUpdateLesson(classroomId);
  const statusMutation = useSetLessonStatus(classroomId);
  const deleteMutation = useDeleteLesson(classroomId);
  const createResourceMutation = useCreateResource(classroomId);

  const published = lesson.status === "published";

  async function handleToggleStatus() {
    if (statusMutation.isPending) return;
    try {
      await statusMutation.mutateAsync({ lessonId: lesson.id, status: published ? "draft" : "published" });
    } catch {
      // el error queda en statusMutation.error -- no hay superficie inline dedicada acá (mismo
      // criterio que ActiveToggle en ProgramsPanel), la próxima interacción vuelve a intentar.
    }
  }

  return (
    <div style={{ borderLeft: "2px solid var(--border-subtle)", paddingLeft: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", cursor: "pointer", padding: "6px 0", minWidth: 0 }}
        >
          <Icon name={expanded ? "caret-down" : "caret-right"} size={12} color="var(--text-muted)" />
          <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lesson.title}
          </span>
          <Tag tone={published ? "success" : "neutral"} size="sm">
            {published ? "Publicado" : "Borrador"}
          </Tag>
          <span style={{ font: "var(--weight-medium) var(--text-micro-size)/1 var(--font-body)", color: "var(--text-subtle)" }}>
            {lesson.resources.length} {lesson.resources.length === 1 ? "recurso" : "recursos"}
          </span>
        </button>

        <span style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
          <IconButton
            icon={published ? "eye-slash" : "eye"}
            label={published ? "Pasar a borrador" : "Publicar"}
            size="sm"
            onClick={handleToggleStatus}
            disabled={statusMutation.isPending}
          />
          <TitleDescriptionFormButton
            modalTitle="Editar lección"
            triggerLabel="Editar"
            triggerVariant="ghost"
            triggerSize="sm"
            defaultTitle={lesson.title}
            defaultDescription={lesson.description}
            onSubmit={(input) => updateMutation.mutateAsync({ lessonId: lesson.id, input })}
          />
          <ConfirmActionButton
            label="Eliminar"
            icon="trash"
            variant="ghost"
            size="sm"
            confirmTitle="Eliminar lección"
            confirmDescription={`Se eliminará "${lesson.title}" y todos sus recursos. Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            action={async () => {
              try {
                await deleteMutation.mutateAsync(lesson.id);
                return {};
              } catch (err) {
                return { error: err instanceof Error ? err.message : "No pudimos eliminar la lección. Inténtalo de nuevo en unos minutos." };
              }
            }}
          />
        </span>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0 var(--space-3) 20px" }}>
          {lesson.resources.map((resource) => (
            <ResourceRow key={resource.id} classroomId={classroomId} resource={resource} />
          ))}
          <div>
            <ResourceFormButton
              modalTitle="Agregar recurso"
              triggerLabel="+ Agregar recurso"
              triggerVariant="ghost"
              triggerSize="sm"
              onSubmit={(input) => createResourceMutation.mutateAsync({ lessonId: lesson.id, input })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
