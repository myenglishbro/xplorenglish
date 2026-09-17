import React from "react";
import { Icon } from "@/components/ui/core/Icon";
import { IconButton } from "@/components/ui/core/IconButton";
import { Tag } from "@/components/ui/core/Tag";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { TitleDescriptionFormButton } from "./TitleDescriptionFormButton";
import { LessonCard } from "./LessonCard";
import { useUpdateModule, useSetModuleStatus, useDeleteModule, useCreateLesson } from "@/features/content/hooks";
import type { ModuleItem } from "@/server/classrooms/content/types";

export function ModuleCard({ classroomId, module: moduleItem }: { classroomId: number; module: ModuleItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const updateMutation = useUpdateModule(classroomId);
  const statusMutation = useSetModuleStatus(classroomId);
  const deleteMutation = useDeleteModule(classroomId);
  const createLessonMutation = useCreateLesson(classroomId);

  const published = moduleItem.status === "published";

  async function handleToggleStatus() {
    if (statusMutation.isPending) return;
    try {
      await statusMutation.mutateAsync({ moduleId: moduleItem.id, status: published ? "draft" : "published" });
    } catch {
      // mismo criterio que LessonCard/ActiveToggle: sin superficie inline dedicada, se reintenta
      // en la próxima interacción.
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", cursor: "pointer", padding: 0, minWidth: 0 }}
        >
          <Icon name={expanded ? "caret-down" : "caret-right"} size={14} color="var(--text-muted)" />
          <Icon name="books" size={16} color="var(--cyan-600)" />
          <span style={{ font: "var(--weight-bold) var(--text-body-size)/1.3 var(--font-display)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {moduleItem.title}
          </span>
          <Tag tone={published ? "success" : "neutral"} size="sm">
            {published ? "Publicado" : "Borrador"}
          </Tag>
          <span style={{ font: "var(--weight-medium) var(--text-micro-size)/1 var(--font-body)", color: "var(--text-subtle)" }}>
            {moduleItem.lessons.length} {moduleItem.lessons.length === 1 ? "lección" : "lecciones"}
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
            modalTitle="Editar módulo"
            triggerLabel="Editar"
            triggerVariant="ghost"
            triggerSize="sm"
            defaultTitle={moduleItem.title}
            defaultDescription={moduleItem.description}
            onSubmit={(input) => updateMutation.mutateAsync({ moduleId: moduleItem.id, input })}
          />
          <ConfirmActionButton
            label="Eliminar"
            icon="trash"
            variant="ghost"
            size="sm"
            confirmTitle="Eliminar módulo"
            confirmDescription={`Se eliminará "${moduleItem.title}" junto con todas sus lecciones y recursos. Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            action={async () => {
              try {
                await deleteMutation.mutateAsync(moduleItem.id);
                return {};
              } catch (err) {
                return { error: err instanceof Error ? err.message : "No pudimos eliminar el módulo. Inténtalo de nuevo en unos minutos." };
              }
            }}
          />
        </span>
      </div>

      {moduleItem.description && (
        <p style={{ margin: "6px 0 0 38px", font: "var(--weight-regular) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--text-muted)" }}>
          {moduleItem.description}
        </p>
      )}

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)", marginLeft: 24 }}>
          {moduleItem.lessons.map((lesson) => (
            <LessonCard key={lesson.id} classroomId={classroomId} lesson={lesson} />
          ))}
          <div>
            <TitleDescriptionFormButton
              modalTitle="Nueva lección"
              triggerLabel="+ Nueva lección"
              triggerVariant="ghost"
              triggerSize="sm"
              onSubmit={(input) => createLessonMutation.mutateAsync({ moduleId: moduleItem.id, input })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
