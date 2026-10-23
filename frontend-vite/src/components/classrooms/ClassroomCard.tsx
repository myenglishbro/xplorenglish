import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Avatar } from "@/components/ui/surfaces/Avatar";
import type { ClassroomTeacherCard } from "@/features/classrooms/hooks";

/** Recorta a 2 líneas con elipsis (`-webkit-line-clamp`), sin forzar `nowrap`. */
const TWO_LINE_CLAMP: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/**
 * Estilos de las tarjetas de salón (docente y estudiante). La interacción vive en la propia tarjeta
 * (un <Link> con estilos en clase CSS, sin `Card` ni estilos inline de borde/sombra), así que
 * `:hover` aplica sin pelear con nada. Efectos: elevación, barra de color que se dibuja, brillo de
 * fondo, icono que reacciona y CTA que se rellena. `prefers-reduced-motion` los desactiva.
 *
 * Ojo con el subrayado: base.css define `a:hover { text-decoration: underline; color: <link-hover> }`
 * (especificidad 0,1,1) que le ganaría a `.xp-salon` (0,1,0) justo al pasar el mouse -- por eso
 * `text-decoration: none` / `color: inherit` se repiten en los estados :hover/:focus-visible.
 */
const STYLES = `
  .xp-salon {
    position: relative; display: flex; flex-direction: column; gap: 14px; height: 100%;
    padding: 20px; overflow: hidden; text-decoration: none; color: inherit;
    background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs);
    transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease;
    animation: xp-salon-in .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 55ms);
  }
  .xp-salon:hover, .xp-salon:focus, .xp-salon:focus-visible, .xp-salon:active { text-decoration: none; color: inherit; }
  .xp-salon > * { position: relative; z-index: 1; }
  .xp-salon::before {
    content: ""; position: absolute; z-index: 2; inset: 0 0 auto 0; height: 4px;
    background: linear-gradient(90deg, var(--xp-cyan), var(--cyan-200));
    transform: scaleX(0); transform-origin: left; transition: transform .4s cubic-bezier(.2,.8,.2,1);
  }
  .xp-salon::after {
    content: ""; position: absolute; z-index: 0; top: -48px; right: -48px; width: 160px; height: 160px; border-radius: 50%;
    background: var(--surface-accent-subtle); opacity: 0; transform: scale(.5);
    transition: opacity .35s ease, transform .45s cubic-bezier(.2,.8,.2,1);
  }
  .xp-salon:hover, .xp-salon:focus-visible {
    transform: translateY(-5px); border-color: var(--cyan-200); box-shadow: var(--shadow-lg);
  }
  .xp-salon:hover::before, .xp-salon:focus-visible::before { transform: scaleX(1); }
  .xp-salon:hover::after, .xp-salon:focus-visible::after { opacity: 1; transform: scale(1); }
  .xp-salon:active { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .xp-salon:focus-visible { outline: 2px solid var(--xp-cyan); outline-offset: 3px; }

  .xp-salon-icon {
    width: 46px; height: 46px; display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--radius-md); background: var(--surface-accent-subtle); color: var(--cyan-600);
    transition: transform .4s cubic-bezier(.34,1.56,.64,1), background .25s ease, color .25s ease;
  }
  .xp-salon:hover .xp-salon-icon { transform: rotate(-8deg) scale(1.12); background: var(--xp-cyan); color: var(--xp-black); }

  .xp-salon-title { transition: color .2s ease; }
  .xp-salon:hover .xp-salon-title { color: var(--cyan-700); }

  .xp-salon-teachers { display: flex; align-items: center; gap: 12px; margin-top: auto; }
  .xp-salon-avatars { display: inline-flex; flex: 0 0 auto; }
  .xp-salon-avatars > span { border-radius: 50%; box-shadow: 0 0 0 2px var(--surface-card); transition: margin .3s cubic-bezier(.34,1.56,.64,1), transform .3s cubic-bezier(.34,1.56,.64,1); }
  .xp-salon-avatars > span + span { margin-left: -12px; }
  .xp-salon:hover .xp-salon-avatars > span + span { margin-left: -4px; }
  .xp-salon:hover .xp-salon-avatars > span:first-child { transform: scale(1.06); }

  .xp-salon-cta {
    margin-top: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: var(--radius-pill);
    background: var(--surface-sunken); color: var(--cyan-700);
    font: var(--weight-bold) 13px/1 var(--font-display); letter-spacing: .02em;
    transition: background .25s ease, color .25s ease;
  }
  .xp-salon:hover .xp-salon-cta { background: var(--xp-cyan); color: var(--xp-black); }
  .xp-salon-arrow { display: inline-flex; transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
  .xp-salon:hover .xp-salon-arrow { transform: translateX(5px); }

  .xp-salon-skeleton {
    height: 220px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);
    background: linear-gradient(100deg, var(--surface-sunken) 30%, var(--surface-card) 50%, var(--surface-sunken) 70%);
    background-size: 200% 100%; animation: xp-salon-shimmer 1.4s linear infinite;
  }

  @keyframes xp-salon-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes xp-salon-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }

  @media (prefers-reduced-motion: reduce) {
    .xp-salon, .xp-salon::before, .xp-salon::after, .xp-salon-icon, .xp-salon-arrow, .xp-salon-skeleton { animation: none !important; transition: none !important; }
    .xp-salon:hover, .xp-salon:focus-visible, .xp-salon:hover .xp-salon-icon, .xp-salon:hover .xp-salon-arrow { transform: none; }
  }
`;

export const GRID_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "var(--space-4)" };

export function ClassroomCardStyles() {
  return <style>{STYLES}</style>;
}

export function ClassroomCardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div style={GRID_STYLE} aria-busy="true" aria-label="Cargando salones">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="xp-salon-skeleton" />
      ))}
    </div>
  );
}

export interface ClassroomCardProps {
  to: string;
  name: string;
  level: string;
  programName: string;
  description: string | null;
  scheduleNotes: string | null;
  /** Docentes del salón (nombre + foto); se muestran con avatares sobre el botón. */
  teachers?: ClassroomTeacherCard[];
  /** Posición en la grilla: escalona la animación de entrada. */
  index: number;
}

export function ClassroomCard({ to, name, level, programName, description, scheduleNotes, teachers = [], index }: ClassroomCardProps) {
  return (
    <Link to={to} className="xp-salon" style={{ "--i": index } as CSSProperties}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span className="xp-salon-icon">
          <Icon name="chalkboard" size={24} color="currentColor" />
        </span>
        <Tag tone="accent" size="sm">
          Nivel {level}
        </Tag>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 className="xp-salon-title" style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/1.3 var(--font-display)", color: "var(--text-heading)", ...TWO_LINE_CLAMP }}>
          {name}
        </h3>
        <Tag tone="neutral" size="sm" style={{ maxWidth: "100%", overflow: "hidden", width: "fit-content" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{programName}</span>
        </Tag>
      </div>

      {(description || scheduleNotes) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {description && (
            <p style={{ margin: 0, font: "var(--weight-regular) var(--text-body-sm-size)/1.45 var(--font-body)", color: "var(--text-body)", ...TWO_LINE_CLAMP }}>{description}</p>
          )}
          {scheduleNotes && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, color: "var(--text-muted)", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)" }}>
              <span style={{ flex: "0 0 auto", marginTop: 1 }}>
                <Icon name="clock" size={13} color="var(--text-subtle)" />
              </span>
              <span>{scheduleNotes}</span>
            </div>
          )}
        </div>
      )}

      {teachers.length > 0 ? (
        <div className="xp-salon-teachers">
          <span className="xp-salon-avatars">
            {teachers.slice(0, 3).map((t) => (
              <Avatar key={t.id} name={`${t.firstName} ${t.lastName}`} src={t.photoUrl ?? undefined} size={38} />
            ))}
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>{teachers.length === 1 ? "Docente" : "Docentes"}</span>
            <span style={{ font: "var(--weight-semibold) 14px/1.3 var(--font-body)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : ""}
              {teachers.length > 1 ? ` +${teachers.length - 1}` : ""}
            </span>
          </span>
        </div>
      ) : null}

      <div className="xp-salon-cta" style={teachers.length === 0 ? { marginTop: "auto" } : undefined}>
        Entrar al salón
        <span className="xp-salon-arrow">
          <Icon name="arrow-right" weight="bold" size={15} color="currentColor" />
        </span>
      </div>
    </Link>
  );
}
