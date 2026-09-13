"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/core/Icon";
import { IconButton } from "@/components/ui/core/IconButton";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ResourceRenderer } from "./ResourceRenderer";
import { detectKnownProvider } from "@/lib/resources/providers";
import type { ModuleItem, LessonItem } from "@/server/classrooms/content/types";

export interface CourseViewerProps {
  classroomName: string;
  programName: string | null;
  level: string;
  modules: ModuleItem[];
}

interface FlatLesson {
  lesson: LessonItem;
  moduleId: number;
  moduleTitle: string;
}

function flattenLessons(modules: ModuleItem[]): FlatLesson[] {
  return modules.flatMap((m) => m.lessons.map((lesson) => ({ lesson, moduleId: m.id, moduleTitle: m.title })));
}

/** Ícono de la lección en el sidebar -- best-effort a partir de sus recursos (re-detectados, no
 * un campo nuevo en DB): video si tiene YouTube/Vimeo, documento si tiene Drive/Docs/Slides,
 * enlace si solo tiene URLs genéricas, círculo si todavía no tiene recursos. Puramente cosmético,
 * no afecta a `type` real de cada recurso ni a ninguna Server Action. */
function lessonIcon(lesson: LessonItem): string {
  if (lesson.resources.length === 0) return "circle";
  const hasVideo = lesson.resources.some((r) => {
    const known = detectKnownProvider(r.reference);
    return known?.type === "youtube" || known?.type === "vimeo";
  });
  if (hasVideo) return "video-camera";
  const hasDoc = lesson.resources.some((r) => detectKnownProvider(r.reference) !== null);
  if (hasDoc) return "file-text";
  return "link-simple";
}

/**
 * Vista de consumo del estudiante -- deliberadamente NO reutiliza ContentTree (el editor
 * admin/docente): layout LMS a (casi) toda la altura del panel de contenido, con su propio header
 * compacto, sidebar de navegación con scroll independiente y panel principal centrado. `modules`
 * ya viene filtrado por RLS a solo lo publicado (mismo getContentTree que usa el editor) -- este
 * componente es puramente de presentación, sin ninguna Server Action.
 *
 * El wrapper raíz cancela con márgenes negativos el padding de `<main>` en AppShell (24px,
 * `var(--space-6)`) para poder ocupar el alto disponible del panel de contenido sin dejar un
 * "hero" ni gutters grandes alrededor -- AppShell en sí no se toca, así que el resto de páginas
 * (admin/docente/otras del estudiante) no se ven afectadas.
 */
export function CourseViewer({ classroomName, programName, level, modules }: CourseViewerProps) {
  const router = useRouter();
  const flat = React.useMemo(() => flattenLessons(modules), [modules]);
  const [selectedLessonId, setSelectedLessonId] = React.useState<number | null>(flat[0]?.lesson.id ?? null);
  const [expandedModuleIds, setExpandedModuleIds] = React.useState<number[]>(() => (flat[0] ? [flat[0].moduleId] : []));

  React.useEffect(() => {
    if (flat.length === 0) {
      setSelectedLessonId(null);
      return;
    }
    setSelectedLessonId((prev) => (prev !== null && flat.some((f) => f.lesson.id === prev) ? prev : (flat[0] as FlatLesson).lesson.id));
  }, [flat]);

  React.useEffect(() => {
    if (selectedLessonId === null) return;
    const match = flat.find((f) => f.lesson.id === selectedLessonId);
    if (!match) return;
    setExpandedModuleIds((prev) => (prev.includes(match.moduleId) ? prev : [...prev, match.moduleId]));
  }, [selectedLessonId, flat]);

  function toggleModule(moduleId: number) {
    setExpandedModuleIds((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
  }

  const currentIndex = Math.max(
    0,
    flat.findIndex((f) => f.lesson.id === selectedLessonId)
  );
  const current = flat.length > 0 ? ((flat[currentIndex] ?? flat[0]) as FlatLesson) : null;

  return (
    <div
      style={{
        margin: "calc(var(--space-6) * -1)",
        height: "calc(100% + var(--space-6) * 2)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--surface-sunken)",
      }}
    >
      <style>{`
        .xp-lms-body { display: flex; flex: 1; min-height: 0; }
        .xp-lms-sidebar { flex: 0 0 300px; }
        .xp-lms-mobile-nav { display: none; }
        .xp-lms-main-inner { padding: var(--space-7) var(--space-7) var(--space-9); }
        @media (max-width: 860px) {
          .xp-lms-sidebar { display: none; }
          .xp-lms-mobile-nav { display: block; }
          .xp-lms-main-inner { padding: 16px; }
        }
      `}</style>

      <header
        style={{
          flex: "0 0 auto",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 var(--space-5)",
          background: "var(--surface-card)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <IconButton icon="arrow-left" label="Volver a Mis salones" onClick={() => router.push("/student/salones")} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              font: "var(--weight-bold) 16px/1.2 var(--font-display)",
              color: "var(--text-heading)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {classroomName}
          </div>
          <div style={{ font: "var(--weight-regular) var(--text-caption-size)/1.2 var(--font-body)", color: "var(--text-muted)", marginTop: 2 }}>
            {programName ?? "—"} · Nivel {level}
          </div>
        </div>
        {current && (
          <div
            style={{
              marginLeft: "auto",
              flex: "0 0 auto",
              font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {currentIndex + 1} / {flat.length}
          </div>
        )}
      </header>

      {!current ? (
        <div style={{ padding: "var(--space-7)" }}>
          <EmptyState icon="books" title="Sin contenido publicado todavía">
            Cuando tu docente publique módulos y lecciones, aparecerán aquí.
          </EmptyState>
        </div>
      ) : (
        <div className="xp-lms-body">
          <nav
            className="xp-lms-sidebar"
            style={{
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
              overflowY: "auto",
              padding: "var(--space-4) 0",
            }}
          >
            <div className="xp-eyebrow" style={{ padding: "0 var(--space-4)", marginBottom: "var(--space-3)" }}>
              Contenido del salón
            </div>
            {modules.map((m) => {
              const expanded = expandedModuleIds.includes(m.id);
              return (
                <div key={m.id} style={{ marginBottom: 2 }}>
                  <button
                    type="button"
                    onClick={() => toggleModule(m.id)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px var(--space-4)",
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon name={expanded ? "caret-down" : "caret-right"} size={13} color="var(--text-muted)" />
                    <Icon name="books" size={15} color="var(--cyan-600)" />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)",
                        color: "var(--text-heading)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.title}
                    </span>
                    <span style={{ font: "var(--weight-medium) var(--text-micro-size)/1 var(--font-body)", color: "var(--text-subtle)" }}>
                      {m.lessons.length}
                    </span>
                  </button>
                  {expanded && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {m.lessons.length === 0 ? (
                        <span style={{ padding: "6px var(--space-4) 6px 44px", color: "var(--text-subtle)", fontSize: "var(--text-caption-size)" }}>
                          Sin lecciones.
                        </span>
                      ) : (
                        m.lessons.map((l) => {
                          const active = l.id === current.lesson.id;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setSelectedLessonId(l.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                textAlign: "left",
                                padding: "8px var(--space-4) 8px 32px",
                                border: 0,
                                borderLeft: active ? "3px solid var(--border-accent)" : "3px solid transparent",
                                background: active ? "var(--surface-selected)" : "transparent",
                                color: active ? "var(--text-accent)" : "var(--text-body)",
                                font: `var(--weight-${active ? "semibold" : "regular"}) var(--text-body-sm-size)/1.4 var(--font-body)`,
                                cursor: "pointer",
                              }}
                            >
                              <Icon name={lessonIcon(l)} size={14} color={active ? "var(--cyan-700)" : "var(--text-subtle)"} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            <div className="xp-lms-mobile-nav" style={{ padding: "12px 16px 0" }}>
              <select
                value={current.lesson.id}
                onChange={(e) => setSelectedLessonId(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "var(--control-h-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  padding: "0 12px",
                  font: "var(--weight-medium) var(--text-body-sm-size)/1 var(--font-body)",
                  background: "var(--surface-card)",
                  color: "var(--text-body)",
                }}
              >
                {modules.map((m) => (
                  <optgroup key={m.id} label={m.title}>
                    {m.lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="xp-lms-main-inner" style={{ maxWidth: 1080, margin: "0 auto" }}>
              <div style={{ marginBottom: "var(--space-6)" }}>
                <div className="xp-eyebrow" style={{ marginBottom: 6 }}>
                  {current.moduleTitle}
                </div>
                <h1 style={{ font: "var(--weight-bold) var(--text-h3-size)/1.3 var(--font-display)", color: "var(--text-heading)" }}>
                  {current.lesson.title}
                </h1>
                {current.lesson.description && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      font: "var(--weight-regular) var(--text-body-size)/1.6 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {current.lesson.description}
                  </p>
                )}
              </div>

              {current.lesson.resources.length === 0 ? (
                <EmptyState icon="folder-open" title="Sin recursos todavía">
                  Tu docente todavía no agregó recursos a esta lección.
                </EmptyState>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                  {current.lesson.resources.map((r) => (
                    <ResourceRenderer key={r.id} resource={r} />
                  ))}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: "var(--space-8)",
                  paddingTop: "var(--space-5)",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <Button
                  variant="secondary"
                  icon="arrow-left"
                  onClick={() => setSelectedLessonId((flat[currentIndex - 1] as FlatLesson).lesson.id)}
                  disabled={currentIndex <= 0}
                >
                  Anterior
                </Button>
                <span style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1 var(--font-body)", color: "var(--text-muted)" }}>
                  {currentIndex + 1} de {flat.length}
                </span>
                <Button
                  variant="secondary"
                  iconRight="arrow-right"
                  onClick={() => setSelectedLessonId((flat[currentIndex + 1] as FlatLesson).lesson.id)}
                  disabled={currentIndex >= flat.length - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
