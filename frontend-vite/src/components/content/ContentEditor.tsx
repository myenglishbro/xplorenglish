import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ModuleCard } from "./ModuleCard";
import { TitleDescriptionFormButton } from "./TitleDescriptionFormButton";
import { useCreateModule } from "@/features/content/hooks";
import type { ModuleItem } from "@/server/classrooms/content/types";

export interface ContentEditorProps {
  classroomId: number;
  modules: ModuleItem[];
}

/**
 * Editor de contenido académico (módulos -> lecciones -> recursos) compartido por Admin y Teacher
 * -- un solo componente, nunca dos. La autorización real es RLS (modules/lessons/resources
 * *_admin_write + *_teacher_write, 0005/0016): este componente no decide quién puede editar qué,
 * solo se monta o no según el rol de quien ve la página (ver SalonDetailAdminPage.tsx y
 * SalonDetailPage.tsx) -- Student nunca lo monta, sigue viendo CourseViewer de solo lectura.
 *
 * Equivalente funcional de ContentTree (Next), rediseñado como árbol colapsable en vez de la
 * grilla original -- mismas 11 operaciones (crear/editar/publicar/borrar x3 niveles), mismo
 * `getContentTree` de base (RLS ya filtra qué ve cada rol, esto no vuelve a decidirlo).
 */
export function ContentEditor({ classroomId, modules }: ContentEditorProps) {
  const createModuleMutation = useCreateModule(classroomId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {modules.length === 0 ? (
        <EmptyState icon="books" title="Sin contenido todavía">
          Crea el primer módulo para empezar a organizar el contenido de este salón.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {modules.map((moduleItem) => (
            <ModuleCard key={moduleItem.id} classroomId={classroomId} module={moduleItem} />
          ))}
        </div>
      )}

      <div>
        <TitleDescriptionFormButton
          modalTitle="Nuevo módulo"
          triggerLabel="+ Nuevo módulo"
          triggerVariant="primary"
          triggerIcon="plus"
          onSubmit={(input) => createModuleMutation.mutateAsync(input)}
        />
      </div>
    </div>
  );
}
