import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useDeleteExercise, useExercises } from "@/features/questionBank/hooks";
import { ExerciseEditorModal } from "@/features/questionBank/components/ExerciseEditorModal";
import { ExercisePreview } from "@/features/questionBank/components/ExercisePreview";
import { KIND_LABELS, type ExerciseKind, type ExerciseListItem } from "@/server/questionBank/types";
import { LEVELS } from "@/lib/questionBank/prompts";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Icon } from "@/components/ui/core/Icon";
import { Tag } from "@/components/ui/core/Tag";
import { Input } from "@/components/ui/forms/Input";
import { Checkbox } from "@/components/ui/forms/Checkbox";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";

const PAGE_SIZE = 12;

const CATEGORIES: { kind: ExerciseKind; icon: string; title: string; text: string }[] = [
  { kind: "exercise", icon: "list-checks", title: "Práctica", text: "Opción múltiple, completar, emparejar" },
  { kind: "listening", icon: "headphones", title: "Listening", text: "Audio o video con preguntas" },
  { kind: "writing", icon: "pencil-line", title: "Writing", text: "Redacciones con feedback" },
  { kind: "speaking", icon: "microphone", title: "Speaking", text: "Grabaciones con feedback" },
];

const ICONS = Object.fromEntries(CATEGORIES.map((c) => [c.kind, c.icon])) as Record<ExerciseKind, string>;
const h1: React.CSSProperties = { font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)", letterSpacing: "var(--text-h2-ls)", color: "var(--text-heading)", margin: 0 };

function itemCount(e: ExerciseListItem): string | null {
  const c = e.content;
  return "items" in c ? `${c.items.length} preguntas` : null;
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 32,
        padding: "0 14px",
        cursor: "pointer",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${active ? "var(--xp-cyan)" : "var(--border-default)"}`,
        background: active ? "var(--xp-cyan)" : "var(--surface-card)",
        color: active ? "var(--xp-black)" : "var(--text-heading)",
        font: "var(--weight-semibold) 13px/1 var(--font-body)",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Banco de preguntas compartido por docentes y admin (/teacher/banco-preguntas, /admin/banco-preguntas).
 * Se navega por categorías (tipo de ejercicio): la portada muestra las categorías con su conteo y,
 * al elegir una (`?cat=`), la lista de esa categoría con búsqueda, filtro por nivel y paginación.
 */
export function QuestionBankPage() {
  const { user, profile } = useAuth();
  const { data, isLoading, isError } = useExercises();
  const del = useDeleteExercise();
  const [params, setParams] = useSearchParams();
  const catParam = params.get("cat") as ExerciseKind | null;
  const cat = CATEGORIES.find((c) => c.kind === catParam) ?? null;

  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [editing, setEditing] = React.useState<ExerciseListItem | undefined>();
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);

  const isAdmin = profile?.role === "admin";
  const all = data ?? [];

  const selectCategory = (kind: ExerciseKind | null) => {
    setParams(kind ? { cat: kind } : {}, { replace: false });
    setSearch("");
    setLevel("");
    setOnlyMine(false);
    setVisible(PAGE_SIZE);
    setOpenId(null);
  };

  const counts = React.useMemo(() => {
    const c: Record<ExerciseKind, number> = { exercise: 0, listening: 0, writing: 0, speaking: 0 };
    for (const e of all) c[e.kind] += 1;
    return c;
  }, [all]);

  const inCategory = cat ? all.filter((e) => e.kind === cat.kind) : [];
  const levelsPresent = LEVELS.filter((l) => inCategory.some((e) => e.level === l));
  const q = search.trim().toLowerCase();
  const filtered = inCategory.filter((e) => (!level || e.level === level) && (!onlyMine || e.createdBy === user?.id) && (!q || e.title.toLowerCase().includes(q)));
  const shown = filtered.slice(0, visible);

  // Con texto escrito en la portada se busca en TODO el banco, sin tener que elegir categoría.
  const globalResults = !cat && q ? all.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 30) : null;

  const renderRow = (e: ExerciseListItem, showKind: boolean) => {
    const mine = e.createdBy === user?.id;
    const canEdit = mine || isAdmin;
    return (
      <Card key={e.id}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
            <span style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: "var(--radius-md)", background: "var(--surface-accent-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={ICONS[e.kind]} size={22} color="var(--cyan-600)" />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ font: "var(--weight-bold) 16px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{e.title}</span>
                {showKind && <Tag tone="accent">{KIND_LABELS[e.kind]}</Tag>}
                {e.level && <Tag tone="neutral">{e.level}</Tag>}
                {mine && <Tag tone="brand">Tuyo</Tag>}
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{[itemCount(e), new Date(e.createdAt).toLocaleDateString("es-PE", { dateStyle: "medium" })].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button variant="secondary" size="sm" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
              {openId === e.id ? "Ocultar" : "Ver"}
            </Button>
            {canEdit && (
              <Button variant="ghost" size="sm" icon="pencil-simple" onClick={() => setEditing(e)}>
                Editar
              </Button>
            )}
            {canEdit &&
              (confirmId === e.id ? (
                <>
                  <Button variant="danger" size="sm" loading={del.isPending} onClick={() => del.mutate(e.id, { onSuccess: () => setConfirmId(null) })}>
                    Confirmar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" icon="trash" aria-label="Eliminar ejercicio" onClick={() => setConfirmId(e.id)} />
              ))}
          </div>
        </div>
        {confirmId === e.id && (
          <Alert tone="warning" style={{ marginTop: "var(--space-3)" }}>
            Las actividades que ya asignaste a salones no se ven afectadas: conservan su propia copia.
          </Alert>
        )}
        {del.isError && confirmId === e.id && (
          <Alert tone="danger" style={{ marginTop: "var(--space-3)" }}>
            {del.error.message}
          </Alert>
        )}
        {openId === e.id && (
          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
            <ExercisePreview content={e.content} />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          {cat ? (
            <>
              <button
                type="button"
                onClick={() => selectCategory(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "none", padding: 0, cursor: "pointer", font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)" }}
              >
                <Icon name="arrow-left" size={14} /> Banco de preguntas
              </button>
              <h1 style={{ ...h1, marginTop: 8 }}>{cat.title}</h1>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{counts[cat.kind]} {counts[cat.kind] === 1 ? "ejercicio" : "ejercicios"} en esta categoría</p>
            </>
          ) : (
            <>
              <h1 style={h1}>Banco de preguntas</h1>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
                Elige una categoría. Para usar un ejercicio con un estudiante, entra al salón y pulsa "Asignar actividad".
              </p>
            </>
          )}
        </div>
        <Button icon="plus" onClick={() => setCreating(true)}>
          {cat ? `Crear ${cat.title}` : "Crear ejercicio"}
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando banco…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar el banco de preguntas.</Alert>
      ) : !cat ? (
        <>
          <Input icon="magnifying-glass" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en todo el banco…" />

          {globalResults ? (
            globalResults.length === 0 ? (
              <EmptyState icon="magnifying-glass" title="Sin resultados">
                Ningún ejercicio coincide con "{search}".
              </EmptyState>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>{globalResults.map((e) => renderRow(e, true))}</div>
            )
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--space-4)" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => selectCategory(c.kind)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "var(--space-5)",
                    textAlign: "left",
                    cursor: "pointer",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <span style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: "var(--surface-accent-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={c.icon} size={28} color="var(--cyan-600)" />
                  </span>
                  <span style={{ font: "var(--weight-bold) 19px/1.2 var(--font-display)", color: "var(--text-heading)" }}>{c.title}</span>
                  <span style={{ font: "var(--weight-regular) 13px/1.4 var(--font-body)", color: "var(--text-muted)" }}>{c.text}</span>
                  <span style={{ marginTop: 4, font: "var(--weight-bold) 13px/1 var(--font-body)", color: "var(--cyan-700)" }}>
                    {counts[c.kind]} {counts[c.kind] === 1 ? "ejercicio" : "ejercicios"} →
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ flex: "1 1 240px" }}>
              <Input icon="magnifying-glass" value={search} onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }} placeholder={`Buscar en ${cat.title}…`} />
            </div>
            <Checkbox label="Solo los míos" checked={onlyMine} onChange={(e) => { setOnlyMine(e.target.checked); setVisible(PAGE_SIZE); }} />
          </div>

          {levelsPresent.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Chip active={level === ""} onClick={() => { setLevel(""); setVisible(PAGE_SIZE); }}>
                Todos los niveles
              </Chip>
              {levelsPresent.map((l) => (
                <Chip key={l} active={level === l} onClick={() => { setLevel(l); setVisible(PAGE_SIZE); }}>
                  {l}
                </Chip>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={cat.icon}
              title={inCategory.length === 0 ? `Aún no hay ejercicios de ${cat.title}` : "Sin resultados"}
              action={inCategory.length === 0 ? <Button onClick={() => setCreating(true)}>Crear el primero</Button> : undefined}
            >
              {inCategory.length === 0 ? "Crea el primero; te guiamos paso a paso." : "Prueba con otro nivel o con otra búsqueda."}
            </EmptyState>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>{shown.map((e) => renderRow(e, false))}</div>
              {filtered.length > shown.length && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Mostrando {shown.length} de {filtered.length}
                  </span>
                  <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Mostrar más
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <ExerciseEditorModal open={creating} initialKind={cat?.kind} onClose={() => setCreating(false)} />
      <ExerciseEditorModal open={!!editing} exercise={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
