import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useMyClassroomsAsTeacher } from "@/features/classrooms/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";

/** Recorta a 2 líneas con elipsis -- técnica CSS estándar (`-webkit-line-clamp`), sin librería
 * nueva, ampliamente soportada. Nunca fuerza `white-space: nowrap` (permite que el título envuelva
 * hasta 2 líneas en vez de truncar en la primera). */
const TWO_LINE_CLAMP: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export function TeacherSalonesPage() {
  const { data: classrooms, isLoading, isError } = useMyClassroomsAsTeacher();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Mis salones
      </h1>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando salones…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar tus salones. Recarga la página.</Alert>
      ) : classrooms && classrooms.length === 0 ? (
        <Card>
          <EmptyState icon="chalkboard" title="Todavía no tienes salones asignados">
            Cuando el admin te asigne como titular o suplente de un salón, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Interacción de hover/lift vive en el FRAME que envuelve la Card, nunca en la Card
              misma: Card ya fija `border`/`boxShadow` inline de forma incondicional (ver
              ui/surfaces/Card.tsx), y un inline style siempre gana sobre una regla de hoja de
              estilos sin importar su selector -- una regla `:hover` apuntando directo a la Card
              simplemente no aplicaría nunca. El frame, en cambio, es un elemento propio sin estilos
              inline propios, así que sus reglas :hover funcionan sin pelear con nada. */}
          <style>{`
            .xp-classroom-card-link { display: block; height: 100%; text-decoration: none; }
            .xp-classroom-card-frame { height: 100%; border-radius: var(--radius-lg); transition: var(--transition-control); }
            .xp-classroom-card-link:hover .xp-classroom-card-frame {
              transform: translateY(-2px);
              box-shadow: 0 0 0 1px var(--cyan-200), var(--shadow-sm);
            }
            .xp-classroom-card-arrow { display: inline-flex; transition: var(--transition-control); }
            .xp-classroom-card-link:hover .xp-classroom-card-arrow { transform: translateX(2px); }
          `}</style>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
            {classrooms?.map((c) => (
              <Link key={c.id} to={`/teacher/salones/${c.id}`} className="xp-classroom-card-link">
                <div className="xp-classroom-card-frame">
                  <Card style={{ height: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <span
                          style={{
                            flex: "0 0 auto",
                            width: 38,
                            height: 38,
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-accent-subtle)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon name="chalkboard" size={19} color="var(--cyan-600)" />
                        </span>
                        <Tag tone="accent" size="sm">
                          {c.level}
                        </Tag>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <h3
                          style={{
                            margin: 0,
                            font: "var(--weight-bold) var(--text-h4-size)/1.3 var(--font-display)",
                            color: "var(--text-heading)",
                            ...TWO_LINE_CLAMP,
                          }}
                        >
                          {c.name}
                        </h3>
                        <Tag tone="neutral" size="sm" style={{ maxWidth: "100%", overflow: "hidden" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.programName}</span>
                        </Tag>
                      </div>

                      {(c.description || c.scheduleNotes) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {c.description && (
                            <p
                              style={{
                                margin: 0,
                                font: "var(--weight-regular) var(--text-body-sm-size)/1.4 var(--font-body)",
                                color: "var(--text-body)",
                                ...TWO_LINE_CLAMP,
                              }}
                            >
                              {c.description}
                            </p>
                          )}
                          {c.scheduleNotes && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 6,
                                color: "var(--text-muted)",
                                font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
                              }}
                            >
                              <span style={{ flex: "0 0 auto", marginTop: 1 }}>
                                <Icon name="clock" size={13} color="var(--text-subtle)" />
                              </span>
                              <span>{c.scheduleNotes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderTop: "1px solid var(--border-subtle)",
                          font: "var(--weight-bold) var(--text-caption-size)/1 var(--font-display)",
                          letterSpacing: ".02em",
                          color: "var(--cyan-700)",
                        }}
                      >
                        Ver salón
                        <span className="xp-classroom-card-arrow">
                          <Icon name="arrow-right" weight="bold" size={14} color="var(--cyan-700)" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
