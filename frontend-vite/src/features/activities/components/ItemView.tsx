import React from "react";
import { Icon } from "@/components/ui/core/Icon";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import type { PublicExerciseItem } from "@/server/questionBank/types";

import { type ItemAnswer } from "./itemAnswers";

const questionStyle: React.CSSProperties = {
  margin: 0,
  font: "var(--weight-semibold) 15px/1.5 var(--font-body)",
  color: "var(--text-heading)",
};

function optionStyle(selected: boolean, state: "none" | "correct" | "wrong"): React.CSSProperties {
  const border = state === "correct" ? "var(--success-solid)" : state === "wrong" ? "var(--danger-solid)" : selected ? "var(--xp-cyan)" : "var(--border-default)";
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    textAlign: "left",
    cursor: "pointer",
    background: selected ? "var(--surface-accent-subtle)" : "var(--surface-card)",
    border: `${selected || state !== "none" ? 2 : 1}px solid ${border}`,
    borderRadius: "var(--radius-md)",
    font: "var(--weight-regular) 14px/1.4 var(--font-body)",
    color: "var(--text-heading)",
  };
}

export interface ItemViewProps {
  index: number;
  item: PublicExerciseItem;
  value: ItemAnswer;
  onChange?: (value: ItemAnswer) => void;
  /** Resultado del servidor tras enviar (el estudiante nunca ve la respuesta correcta). */
  result?: boolean;
  /** Vista del docente: se marca la respuesta correcta. */
  correct?: unknown;
}

export function ItemView({ index, item, value, onChange, result, correct }: ItemViewProps) {
  const readOnly = !onChange;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ flex: "0 0 auto", font: "var(--weight-bold) 14px/1.5 var(--font-display)", color: "var(--text-muted)" }}>{index + 1}.</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {item.type === "fill_blank" ? (
            <FillBlank prompt={item.prompt} value={value as string[]} onChange={onChange} correct={correct as string[] | undefined} />
          ) : (
            <>
              {item.prompt && <p style={questionStyle}>{item.prompt}</p>}
              {item.type === "multiple_choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {item.options.map((opt, i) => {
                    const selected = value === i;
                    const state = correct === i ? "correct" : "none";
                    return (
                      <button key={i} type="button" disabled={readOnly} onClick={() => onChange?.(i)} style={{ ...optionStyle(selected, state), cursor: readOnly ? "default" : "pointer" }}>
                        <span style={{ font: "var(--weight-bold) 13px/1 var(--font-display)", color: "var(--text-muted)" }}>{String.fromCharCode(65 + i)}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
              {item.type === "true_false" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" disabled={readOnly} onClick={() => onChange?.(v)} style={{ ...optionStyle(value === v, correct === v ? "correct" : "none"), cursor: readOnly ? "default" : "pointer", minWidth: 110 }}>
                      {v ? "Verdadero" : "Falso"}
                    </button>
                  ))}
                </div>
              )}
              {item.type === "matching" && (
                <Matching item={item} value={value as (number | null)[]} onChange={onChange} correct={correct as number[] | undefined} />
              )}
              {item.type === "multiple_select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Marca todas las correctas</span>
                  {item.options.map((opt, i) => {
                    const picked = (Array.isArray(value) ? (value as number[]) : []).includes(i);
                    const isCorrect = Array.isArray(correct) && (correct as number[]).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={readOnly}
                        aria-pressed={picked}
                        onClick={() => onChange?.(picked ? (value as number[]).filter((n) => n !== i) : [...((value as number[]) ?? []), i].sort((a, b) => a - b))}
                        style={{ ...optionStyle(picked, isCorrect ? "correct" : "none"), cursor: readOnly ? "default" : "pointer" }}
                      >
                        <Icon name={picked || isCorrect ? "check-square" : "square"} size={20} color={isCorrect ? "var(--success-solid)" : picked ? "var(--cyan-600)" : "var(--text-muted)"} />
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
              {item.type === "short_answer" &&
                (Array.isArray(correct) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(correct as string[]).map((a, i) => (
                      <span key={i} style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "var(--success-bg)", color: "var(--success-fg)" }}>
                        {a.replace(/\|/g, " / ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Input value={typeof value === "string" ? value : ""} disabled={!onChange} placeholder="Escribe tu respuesta" onChange={(e) => onChange?.(e.target.value)} />
                ))}
              {item.type === "ordering" && <Ordering item={item} value={Array.isArray(value) ? (value as number[]) : []} onChange={onChange} correct={correct as number[] | undefined} />}
              {item.type === "categorize" && (
                <Categorize item={item} value={Array.isArray(value) ? (value as (number | null)[]) : []} onChange={onChange} correct={correct as number[] | undefined} />
              )}
            </>
          )}
        </div>
        {result !== undefined && (
          <Icon name={result ? "check-circle" : "x-circle"} size={22} color={result ? "var(--success-solid)" : "var(--danger-solid)"} style={{ flex: "0 0 auto" }} />
        )}
      </div>
    </div>
  );
}

function FillBlank({ prompt, value, onChange, correct }: { prompt: string; value: string[]; onChange?: (v: ItemAnswer) => void; correct?: string[] }) {
  const parts = prompt.split("___");
  return (
    <p style={{ ...questionStyle, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px" }}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <span>{part}</span>
          {i < parts.length - 1 &&
            (correct ? (
              <span style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "var(--success-bg)", color: "var(--success-fg)" }}>{correct[i]}</span>
            ) : (
              <Input
                size="sm"
                value={value[i] ?? ""}
                disabled={!onChange}
                aria-label={`Espacio ${i + 1}`}
                style={{ width: 130 }}
                onChange={(e) => onChange?.(value.map((v, j) => (j === i ? e.target.value : v)))}
              />
            ))}
        </React.Fragment>
      ))}
    </p>
  );
}

function Matching({
  item,
  value,
  onChange,
  correct,
}: {
  item: Extract<PublicExerciseItem, { type: "matching" }>;
  value: (number | null)[];
  onChange?: (v: ItemAnswer) => void;
  correct?: number[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {item.left.map((l, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <span style={{ font: "var(--weight-semibold) 14px/1.4 var(--font-body)", color: "var(--text-heading)" }}>{l}</span>
          {correct ? (
            <span style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--success-bg)", color: "var(--success-fg)", font: "14px/1.4 var(--font-body)" }}>
              {item.right[correct[i] ?? 0]}
            </span>
          ) : (
            <Select
              value={value[i] === null || value[i] === undefined ? "" : String(value[i])}
              disabled={!onChange}
              placeholder="Elige…"
              options={item.right.map((r, j) => ({ value: String(j), label: r }))}
              onChange={(e) => onChange?.(value.map((v, j) => (j === i ? (e.target.value === "" ? null : Number(e.target.value)) : v)))}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const chip: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  color: "var(--text-heading)",
  font: "var(--weight-semibold) 14px/1.2 var(--font-body)",
};

/** Ordenar piezas: toca una pieza del banco para colocarla; toca una colocada para devolverla. */
function Ordering({
  item,
  value,
  onChange,
  correct,
}: {
  item: Extract<PublicExerciseItem, { type: "ordering" }>;
  value: number[];
  onChange?: (v: ItemAnswer) => void;
  correct?: number[];
}) {
  if (correct) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {correct.map((p, i) => (
          <span key={i} style={{ ...chip, background: "var(--success-bg)", color: "var(--success-fg)", borderColor: "transparent" }}>
            {item.parts[p]}
          </span>
        ))}
      </div>
    );
  }
  const remaining = item.parts.map((_, i) => i).filter((i) => !value.includes(i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        aria-label="Tu respuesta"
        style={{ minHeight: 52, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 10, border: "2px dashed var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)" }}
      >
        {value.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Toca las piezas en el orden correcto</span>}
        {value.map((p) => (
          <button key={p} type="button" disabled={!onChange} onClick={() => onChange?.(value.filter((x) => x !== p))} style={{ ...chip, cursor: "pointer", borderColor: "var(--xp-cyan)", background: "var(--surface-accent-subtle)" }}>
            {item.parts[p]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {remaining.map((p) => (
          <button key={p} type="button" disabled={!onChange} onClick={() => onChange?.([...value, p])} style={{ ...chip, cursor: "pointer" }}>
            {item.parts[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Clasificar: cada elemento se asigna a una categoría. */
function Categorize({
  item,
  value,
  onChange,
  correct,
}: {
  item: Extract<PublicExerciseItem, { type: "categorize" }>;
  value: (number | null)[];
  onChange?: (v: ItemAnswer) => void;
  correct?: number[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {item.items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <span style={{ font: "var(--weight-semibold) 14px/1.4 var(--font-body)", color: "var(--text-heading)" }}>{it}</span>
          {correct ? (
            <span style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--success-bg)", color: "var(--success-fg)", font: "14px/1.4 var(--font-body)" }}>
              {item.categories[correct[i] ?? 0]}
            </span>
          ) : (
            <Select
              value={value[i] === null || value[i] === undefined ? "" : String(value[i])}
              disabled={!onChange}
              placeholder="Categoría…"
              options={item.categories.map((c, j) => ({ value: String(j), label: c }))}
              onChange={(e) => onChange?.(item.items.map((_, j) => (j === i ? (e.target.value === "" ? null : Number(e.target.value)) : (value[j] ?? null))))}
            />
          )}
        </div>
      ))}
    </div>
  );
}
