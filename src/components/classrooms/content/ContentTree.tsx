"use client";

import React from "react";
import { Tag } from "@/components/ui/core/Tag";
import { Switch } from "@/components/ui/forms/Switch";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { TitleDescriptionButton } from "./TitleDescriptionButton";
import { ConfirmDeleteButtonOptimistic } from "./ConfirmDeleteButtonOptimistic";
import { CreateResourceButton } from "./CreateResourceButton";
import { EditResourceButton } from "./EditResourceButton";
import { ResourceLink } from "./ResourceLink";
import {
  createModuleAction,
  updateModuleAction,
  setModuleStatusAction,
  deleteModuleAction,
  createLessonAction,
  updateLessonAction,
  setLessonStatusAction,
  deleteLessonAction,
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from "@/server/classrooms/content/actions";
import type { ContentStatus, LessonItem, ModuleItem, ResourceItem } from "@/server/classrooms/content/types";

export interface ContentTreeProps {
  classroomId: number;
  modules: ModuleItem[];
  /** true para admin y para el docente del salón; false (solo lectura) para estudiante. */
  editable: boolean;
}

/**
 * `_pending`/`_error` son solo para uso interno de este componente -- nunca se envían a ninguna
 * Server Action ni se exportan desde server/classrooms/content/types.ts. `_pending` marca un item
 * optimista (creado/editado/publicado/borrado localmente, todavía no confirmado); `_error` es el
 * mensaje a mostrar cuando una operación sobre un item EXISTENTE falla y se hace rollback (no
 * aplica a creates fallidos: ahí el item directamente se retira, no queda nada donde mostrarlo).
 * Resources tienen exactamente el mismo tratamiento (extendido en un bloque posterior a este
 * comentario): `_pending`/`_error` por recurso, mismas garantías de reconciliación/rollback.
 */
type ClientResource = ResourceItem & { _pending?: boolean; _error?: string };
type ClientLesson = Omit<LessonItem, "resources"> & { resources: ClientResource[]; _pending?: boolean; _error?: string };
type ClientModule = Omit<ModuleItem, "lessons"> & { lessons: ClientLesson[]; _pending?: boolean; _error?: string };

function withModule(prev: ClientModule[], moduleId: number, updater: (m: ClientModule) => ClientModule): ClientModule[] {
  return prev.map((m) => (m.id === moduleId ? updater(m) : m));
}

function withLesson(prev: ClientModule[], moduleId: number, lessonId: number, updater: (l: ClientLesson) => ClientLesson): ClientModule[] {
  return withModule(prev, moduleId, (m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? updater(l) : l)) }));
}

function withResource(
  prev: ClientModule[],
  moduleId: number,
  lessonId: number,
  resourceId: number,
  updater: (r: ClientResource) => ClientResource
): ClientModule[] {
  return withLesson(prev, moduleId, lessonId, (l) => ({ ...l, resources: l.resources.map((r) => (r.id === resourceId ? updater(r) : r)) }));
}

/**
 * Sin router.refresh() (P1b): cada Server Action de contenido ya llama revalidatePath() sobre
 * esta misma ruta -- Next.js adjunta el RSC payload fresco a la propia respuesta y actualiza el
 * árbol montado solo, sin una segunda pasada de render explícita.
 *
 * UI optimista (crear/editar/publicar/despublicar/borrar de módulo y lección, y crear/editar/
 * borrar de recurso): `localModules` es el árbol que realmente se renderiza, inicializado desde
 * la prop `modules` pero mutado de inmediato en cada operación, antes de que exista respuesta del
 * servidor. `pendingCount` cuenta CUALQUIER
 * operación en vuelo sobre el árbol completo (no solo creates); mientras sea > 0, el efecto de
 * abajo NO sobreescribe `localModules` con la prop nueva que trae un revalidatePath() -- así
 * ninguna reconciliación automática puede borrar/pisar una mutation optimista todavía pendiente,
 * sea cual sea.
 */
export function ContentTree({ classroomId, modules, editable }: ContentTreeProps) {
  const [localModules, setLocalModules] = React.useState<ClientModule[]>(modules);
  const [createModuleError, setCreateModuleError] = React.useState<string | undefined>();
  const pendingCount = React.useRef(0);
  const nextTempId = React.useRef(-1);

  React.useEffect(() => {
    if (pendingCount.current === 0) {
      setLocalModules(modules);
    }
  }, [modules]);

  function beginMutation() {
    pendingCount.current += 1;
  }
  function endMutation() {
    pendingCount.current -= 1;
  }

  // ── Módulos ──────────────────────────────────────────────────────────────────────────────

  function createModuleOptimistic(title: string, description: string | null, onError: (message: string) => void) {
    const tempId = nextTempId.current--;
    const optimisticModule: ClientModule = {
      id: tempId,
      classroomId,
      title,
      description,
      status: "draft",
      orderIndex: Number.MAX_SAFE_INTEGER,
      lessons: [],
      _pending: true,
    };

    beginMutation();
    setLocalModules((prev) => [...prev, optimisticModule]);

    const formData = new FormData();
    formData.set("title", title);
    if (description) formData.set("description", description);

    createModuleAction(classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) => prev.filter((m) => m.id !== tempId));
        onError(result.error ?? "No pudimos crear el módulo. Inténtalo de nuevo en unos minutos.");
        return;
      }
      const canonical: ClientModule = { ...result.data, lessons: [] };
      setLocalModules((prev) => prev.map((m) => (m.id === tempId ? canonical : m)));
    });
  }

  function updateModuleOptimistic(moduleId: number, title: string, description: string | null) {
    let snapshot: ClientModule | undefined;
    beginMutation();
    setLocalModules((prev) =>
      withModule(prev, moduleId, (m) => {
        snapshot = m;
        return { ...m, title, description, _pending: true, _error: undefined };
      })
    );

    const formData = new FormData();
    formData.set("title", title);
    if (description) formData.set("description", description);

    updateModuleAction(moduleId, classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) =>
          withModule(prev, moduleId, () => ({
            ...(snapshot as ClientModule),
            _pending: false,
            _error: result.error ?? "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.",
          }))
        );
        return;
      }
      const { title: savedTitle, description: savedDescription } = result.data;
      setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, title: savedTitle, description: savedDescription, _pending: false })));
    });
  }

  function toggleModuleStatusOptimistic(moduleId: number) {
    let previousStatus: ContentStatus = "draft";
    let nextStatus: ContentStatus = "draft";
    beginMutation();
    setLocalModules((prev) =>
      withModule(prev, moduleId, (m) => {
        previousStatus = m.status;
        nextStatus = m.status === "published" ? "draft" : "published";
        return { ...m, status: nextStatus, _pending: true, _error: undefined };
      })
    );

    setModuleStatusAction(moduleId, classroomId, nextStatus).then((result) => {
      endMutation();
      if (result.error) {
        setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, status: previousStatus, _pending: false, _error: result.error })));
        return;
      }
      setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, _pending: false })));
    });
  }

  function deleteModuleOptimistic(moduleId: number) {
    let snapshot: { module: ClientModule; index: number } | undefined;
    beginMutation();
    setLocalModules((prev) => {
      const index = prev.findIndex((m) => m.id === moduleId);
      if (index === -1) return prev;
      snapshot = { module: prev[index] as ClientModule, index };
      return prev.filter((m) => m.id !== moduleId);
    });

    deleteModuleAction(moduleId, classroomId).then((result) => {
      endMutation();
      if (result.error && snapshot) {
        const { module, index } = snapshot;
        setLocalModules((prev) => {
          const next = [...prev];
          next.splice(Math.min(index, next.length), 0, { ...module, _pending: false, _error: result.error });
          return next;
        });
      }
    });
  }

  // ── Lecciones ────────────────────────────────────────────────────────────────────────────

  function createLessonOptimistic(moduleId: number, title: string, description: string | null, onError: (message: string) => void) {
    const tempLessonId = nextTempId.current--;
    const optimisticLesson: ClientLesson = {
      id: tempLessonId,
      moduleId,
      title,
      description,
      status: "draft",
      orderIndex: Number.MAX_SAFE_INTEGER,
      resources: [],
      _pending: true,
    };

    beginMutation();
    setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, lessons: [...m.lessons, optimisticLesson] })));

    const formData = new FormData();
    formData.set("title", title);
    if (description) formData.set("description", description);

    createLessonAction(moduleId, classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== tempLessonId) })));
        onError(result.error ?? "No pudimos crear la lección. Inténtalo de nuevo en unos minutos.");
        return;
      }
      const canonical = result.data;
      setLocalModules((prev) => withModule(prev, moduleId, (m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === tempLessonId ? canonical : l)) })));
    });
  }

  function updateLessonOptimistic(moduleId: number, lessonId: number, title: string, description: string | null) {
    let snapshot: ClientLesson | undefined;
    beginMutation();
    setLocalModules((prev) =>
      withLesson(prev, moduleId, lessonId, (l) => {
        snapshot = l;
        return { ...l, title, description, _pending: true, _error: undefined };
      })
    );

    const formData = new FormData();
    formData.set("title", title);
    if (description) formData.set("description", description);

    updateLessonAction(lessonId, classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) =>
          withLesson(prev, moduleId, lessonId, () => ({
            ...(snapshot as ClientLesson),
            _pending: false,
            _error: result.error ?? "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.",
          }))
        );
        return;
      }
      const { title: savedTitle, description: savedDescription } = result.data;
      setLocalModules((prev) =>
        withLesson(prev, moduleId, lessonId, (l) => ({ ...l, title: savedTitle, description: savedDescription, _pending: false }))
      );
    });
  }

  function toggleLessonStatusOptimistic(moduleId: number, lessonId: number) {
    let previousStatus: ContentStatus = "draft";
    let nextStatus: ContentStatus = "draft";
    beginMutation();
    setLocalModules((prev) =>
      withLesson(prev, moduleId, lessonId, (l) => {
        previousStatus = l.status;
        nextStatus = l.status === "published" ? "draft" : "published";
        return { ...l, status: nextStatus, _pending: true, _error: undefined };
      })
    );

    setLessonStatusAction(lessonId, classroomId, nextStatus).then((result) => {
      endMutation();
      if (result.error) {
        setLocalModules((prev) =>
          withLesson(prev, moduleId, lessonId, (l) => ({ ...l, status: previousStatus, _pending: false, _error: result.error }))
        );
        return;
      }
      setLocalModules((prev) => withLesson(prev, moduleId, lessonId, (l) => ({ ...l, _pending: false })));
    });
  }

  function deleteLessonOptimistic(moduleId: number, lessonId: number) {
    let snapshot: { lesson: ClientLesson; index: number } | undefined;
    beginMutation();
    setLocalModules((prev) =>
      withModule(prev, moduleId, (m) => {
        const index = m.lessons.findIndex((l) => l.id === lessonId);
        if (index === -1) return m;
        snapshot = { lesson: m.lessons[index] as ClientLesson, index };
        return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) };
      })
    );

    deleteLessonAction(lessonId, classroomId).then((result) => {
      endMutation();
      if (result.error && snapshot) {
        const { lesson, index } = snapshot;
        setLocalModules((prev) =>
          withModule(prev, moduleId, (m) => {
            const next = [...m.lessons];
            next.splice(Math.min(index, next.length), 0, { ...lesson, _pending: false, _error: result.error });
            return { ...m, lessons: next };
          })
        );
      }
    });
  }

  // ── Recursos ─────────────────────────────────────────────────────────────────────────────
  // Mismo patrón exacto que módulos/lecciones: id temporal negativo, insert optimista, reconciliar
  // contra el registro canónico del servidor (que incluye el `type` real, detectado a partir de la
  // URL) o revertir. `_pending` en el recurso mismo ya bloquea Editar/Borrar sobre ESE recurso
  // mientras está en vuelo (ver ResourceRow); operaciones sobre otros recursos/lecciones/módulos
  // no se ven afectadas -- cada handler solo toca su propio id dentro del árbol.

  function createResourceOptimistic(moduleId: number, lessonId: number, title: string, reference: string, onError: (message: string) => void) {
    const tempResourceId = nextTempId.current--;
    const optimisticResource: ClientResource = {
      id: tempResourceId,
      lessonId,
      title,
      // Placeholder mientras está pendiente -- el `type` real lo determina el servidor al
      // reconciliar. ResourceLink (fila admin/docente) no distingue por tipo, así que esto es
      // cosméticamente inerte hasta que llega la respuesta real.
      type: "url",
      reference,
      orderIndex: Number.MAX_SAFE_INTEGER,
      _pending: true,
    };

    beginMutation();
    setLocalModules((prev) => withLesson(prev, moduleId, lessonId, (l) => ({ ...l, resources: [...l.resources, optimisticResource] })));

    const formData = new FormData();
    formData.set("title", title);
    formData.set("reference", reference);

    createResourceAction(lessonId, classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) =>
          withLesson(prev, moduleId, lessonId, (l) => ({ ...l, resources: l.resources.filter((r) => r.id !== tempResourceId) }))
        );
        onError(result.error ?? "No pudimos crear el recurso. Inténtalo de nuevo en unos minutos.");
        return;
      }
      const canonical = result.data;
      setLocalModules((prev) =>
        withLesson(prev, moduleId, lessonId, (l) => ({ ...l, resources: l.resources.map((r) => (r.id === tempResourceId ? canonical : r)) }))
      );
    });
  }

  function updateResourceOptimistic(moduleId: number, lessonId: number, resourceId: number, title: string, reference: string) {
    let snapshot: ClientResource | undefined;
    beginMutation();
    setLocalModules((prev) =>
      withResource(prev, moduleId, lessonId, resourceId, (r) => {
        snapshot = r;
        return { ...r, title, reference, _pending: true, _error: undefined };
      })
    );

    const formData = new FormData();
    formData.set("title", title);
    formData.set("reference", reference);

    updateResourceAction(resourceId, classroomId, formData).then((result) => {
      endMutation();
      if (result.error || result.fieldErrors || !result.data) {
        setLocalModules((prev) =>
          withResource(prev, moduleId, lessonId, resourceId, () => ({
            ...(snapshot as ClientResource),
            _pending: false,
            _error: result.error ?? "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.",
          }))
        );
        return;
      }
      // El canonical trae el `type` recalculado a partir de la URL final -- soporta cambiar de
      // proveedor (YouTube -> Drive, Drive -> Slides, YouTube -> URL genérica...) en la misma
      // edición sin que el cliente tenga que saber nunca cuál es el tipo correcto.
      const canonical = result.data;
      setLocalModules((prev) => withResource(prev, moduleId, lessonId, resourceId, () => ({ ...canonical, _pending: false })));
    });
  }

  function deleteResourceOptimistic(moduleId: number, lessonId: number, resourceId: number) {
    let snapshot: { resource: ClientResource; index: number } | undefined;
    beginMutation();
    setLocalModules((prev) =>
      withLesson(prev, moduleId, lessonId, (l) => {
        const index = l.resources.findIndex((r) => r.id === resourceId);
        if (index === -1) return l;
        snapshot = { resource: l.resources[index] as ClientResource, index };
        return { ...l, resources: l.resources.filter((r) => r.id !== resourceId) };
      })
    );

    deleteResourceAction(resourceId, classroomId).then((result) => {
      endMutation();
      if (result.error && snapshot) {
        const { resource, index } = snapshot;
        setLocalModules((prev) =>
          withLesson(prev, moduleId, lessonId, (l) => {
            const next = [...l.resources];
            next.splice(Math.min(index, next.length), 0, { ...resource, _pending: false, _error: result.error });
            return { ...l, resources: next };
          })
        );
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {editable && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-end" }}>
          <TitleDescriptionButton
            triggerLabel="Crear módulo"
            triggerIcon="plus"
            triggerVariant="primary"
            modalTitle="Crear módulo"
            submitLabel="Crear"
            onSubmit={(title, description) => createModuleOptimistic(title, description, setCreateModuleError)}
          />
          {createModuleError && (
            <Alert tone="danger" style={{ width: "100%" }}>
              {createModuleError}
            </Alert>
          )}
        </div>
      )}

      {localModules.length === 0 ? (
        <EmptyState icon="books" title="Sin módulos todavía">
          {editable ? "Crea el primero para empezar a organizar el contenido de este salón." : "Todavía no hay contenido publicado en este salón."}
        </EmptyState>
      ) : (
        localModules.map((m) => (
          <ModuleSection
            key={m.id}
            module={m}
            editable={editable}
            onCreateLesson={createLessonOptimistic}
            onUpdateModule={updateModuleOptimistic}
            onToggleModuleStatus={toggleModuleStatusOptimistic}
            onDeleteModule={deleteModuleOptimistic}
            onUpdateLesson={updateLessonOptimistic}
            onToggleLessonStatus={toggleLessonStatusOptimistic}
            onDeleteLesson={deleteLessonOptimistic}
            onCreateResource={createResourceOptimistic}
            onUpdateResource={updateResourceOptimistic}
            onDeleteResource={deleteResourceOptimistic}
          />
        ))
      )}
    </div>
  );
}

interface ModuleSectionProps {
  module: ClientModule;
  editable: boolean;
  onCreateLesson: (moduleId: number, title: string, description: string | null, onError: (message: string) => void) => void;
  onUpdateModule: (moduleId: number, title: string, description: string | null) => void;
  onToggleModuleStatus: (moduleId: number) => void;
  onDeleteModule: (moduleId: number) => void;
  onUpdateLesson: (moduleId: number, lessonId: number, title: string, description: string | null) => void;
  onToggleLessonStatus: (moduleId: number, lessonId: number) => void;
  onDeleteLesson: (moduleId: number, lessonId: number) => void;
  onCreateResource: (moduleId: number, lessonId: number, title: string, reference: string, onError: (message: string) => void) => void;
  onUpdateResource: (moduleId: number, lessonId: number, resourceId: number, title: string, reference: string) => void;
  onDeleteResource: (moduleId: number, lessonId: number, resourceId: number) => void;
}

function ModuleSection({
  module: mod,
  editable,
  onCreateLesson,
  onUpdateModule,
  onToggleModuleStatus,
  onDeleteModule,
  onUpdateLesson,
  onToggleLessonStatus,
  onDeleteLesson,
  onCreateResource,
  onUpdateResource,
  onDeleteResource,
}: ModuleSectionProps) {
  const [createLessonError, setCreateLessonError] = React.useState<string | undefined>();
  const isPending = mod._pending === true;

  return (
    <details open style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--surface-card)" }}>
      <summary
        style={{
          cursor: "pointer",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          listStyle: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "var(--weight-bold) var(--text-h4-size)/1.3 var(--font-display)", color: "var(--text-heading)" }}>{mod.title}</span>
          {isPending ? (
            <Tag tone="neutral" size="sm">
              Guardando…
            </Tag>
          ) : (
            <Tag tone={mod.status === "published" ? "success" : "neutral"} size="sm">
              {mod.status === "published" ? "Publicado" : "Borrador"}
            </Tag>
          )}
        </span>
        {editable && !isPending && (
          <span style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
            <Switch checked={mod.status === "published"} onChange={() => onToggleModuleStatus(mod.id)} />
            <TitleDescriptionButton
              triggerLabel="Editar"
              triggerIcon="pencil-simple"
              triggerVariant="ghost"
              triggerSize="sm"
              modalTitle="Editar módulo"
              defaultTitle={mod.title}
              defaultDescription={mod.description}
              submitLabel="Guardar"
              onSubmit={(title, description) => onUpdateModule(mod.id, title, description)}
            />
            <ConfirmDeleteButtonOptimistic
              label="Borrar"
              confirmTitle="Borrar módulo"
              confirmDescription={`Esto borra "${mod.title}" y todas sus lecciones y recursos. No se puede deshacer.`}
              onConfirm={() => onDeleteModule(mod.id)}
            />
          </span>
        )}
      </summary>

      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {mod.description && <p style={{ margin: 0, color: "var(--text-muted)" }}>{mod.description}</p>}
        {mod._error && <Alert tone="danger">{mod._error}</Alert>}

        {editable && !isPending && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
            <TitleDescriptionButton
              triggerLabel="Crear lección"
              triggerIcon="plus"
              triggerVariant="secondary"
              triggerSize="sm"
              modalTitle="Crear lección"
              submitLabel="Crear"
              onSubmit={(title, description) => onCreateLesson(mod.id, title, description, setCreateLessonError)}
            />
            {createLessonError && <Alert tone="danger">{createLessonError}</Alert>}
          </div>
        )}

        {mod.lessons.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Sin lecciones todavía.</span>
        ) : (
          mod.lessons.map((l) => (
            <LessonSection
              key={l.id}
              moduleId={mod.id}
              lesson={l}
              editable={editable}
              onUpdateLesson={onUpdateLesson}
              onToggleLessonStatus={onToggleLessonStatus}
              onDeleteLesson={onDeleteLesson}
              onCreateResource={onCreateResource}
              onUpdateResource={onUpdateResource}
              onDeleteResource={onDeleteResource}
            />
          ))
        )}
      </div>
    </details>
  );
}

interface LessonSectionProps {
  moduleId: number;
  lesson: ClientLesson;
  editable: boolean;
  onUpdateLesson: (moduleId: number, lessonId: number, title: string, description: string | null) => void;
  onToggleLessonStatus: (moduleId: number, lessonId: number) => void;
  onDeleteLesson: (moduleId: number, lessonId: number) => void;
  onCreateResource: (moduleId: number, lessonId: number, title: string, reference: string, onError: (message: string) => void) => void;
  onUpdateResource: (moduleId: number, lessonId: number, resourceId: number, title: string, reference: string) => void;
  onDeleteResource: (moduleId: number, lessonId: number, resourceId: number) => void;
}

function LessonSection({
  moduleId,
  lesson,
  editable,
  onUpdateLesson,
  onToggleLessonStatus,
  onDeleteLesson,
  onCreateResource,
  onUpdateResource,
  onDeleteResource,
}: LessonSectionProps) {
  const [createResourceError, setCreateResourceError] = React.useState<string | undefined>();
  const isPending = lesson._pending === true;

  return (
    <details style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)" }}>
      <summary
        style={{
          cursor: "pointer",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          listStyle: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "var(--weight-semibold) var(--text-body-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{lesson.title}</span>
          {isPending ? (
            <Tag tone="neutral" size="sm">
              Guardando…
            </Tag>
          ) : (
            <Tag tone={lesson.status === "published" ? "success" : "neutral"} size="sm">
              {lesson.status === "published" ? "Publicada" : "Borrador"}
            </Tag>
          )}
        </span>
        {editable && !isPending && (
          <span style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
            <Switch checked={lesson.status === "published"} onChange={() => onToggleLessonStatus(moduleId, lesson.id)} />
            <TitleDescriptionButton
              triggerLabel="Editar"
              triggerIcon="pencil-simple"
              triggerVariant="ghost"
              triggerSize="sm"
              modalTitle="Editar lección"
              defaultTitle={lesson.title}
              defaultDescription={lesson.description}
              submitLabel="Guardar"
              onSubmit={(title, description) => onUpdateLesson(moduleId, lesson.id, title, description)}
            />
            <ConfirmDeleteButtonOptimistic
              label="Borrar"
              confirmTitle="Borrar lección"
              confirmDescription={`Esto borra "${lesson.title}" y todos sus recursos. No se puede deshacer.`}
              onConfirm={() => onDeleteLesson(moduleId, lesson.id)}
            />
          </span>
        )}
      </summary>

      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {lesson.description && <p style={{ margin: 0, color: "var(--text-muted)" }}>{lesson.description}</p>}
        {lesson._error && <Alert tone="danger">{lesson._error}</Alert>}

        {editable && !isPending && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
            <CreateResourceButton
              onSubmit={(title, reference) => onCreateResource(moduleId, lesson.id, title, reference, setCreateResourceError)}
            />
            {createResourceError && <Alert tone="danger">{createResourceError}</Alert>}
          </div>
        )}

        {lesson.resources.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>Sin recursos todavía.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {lesson.resources.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                editable={editable}
                onUpdate={(title, reference) => onUpdateResource(moduleId, lesson.id, r.id, title, reference)}
                onDelete={() => onDeleteResource(moduleId, lesson.id, r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

interface ResourceRowProps {
  resource: ClientResource;
  editable: boolean;
  onUpdate: (title: string, reference: string) => void;
  onDelete: () => void;
}

function ResourceRow({ resource, editable, onUpdate, onDelete }: ResourceRowProps) {
  const isPending = resource._pending === true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-body)" }}>{resource.title}</span>
          {isPending && (
            <Tag tone="neutral" size="sm">
              Guardando…
            </Tag>
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ResourceLink resource={resource} />
          {editable && !isPending && (
            <>
              <EditResourceButton resource={resource} onSubmit={onUpdate} />
              <ConfirmDeleteButtonOptimistic
                label="Borrar"
                confirmTitle="Borrar recurso"
                confirmDescription={`Esto borra "${resource.title}". No se puede deshacer.`}
                onConfirm={onDelete}
              />
            </>
          )}
        </div>
      </div>
      {resource._error && <Alert tone="danger">{resource._error}</Alert>}
    </div>
  );
}
