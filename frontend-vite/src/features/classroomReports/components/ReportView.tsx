import { Icon } from "@/components/ui/core/Icon";
import { SKILLS, type ReportItem } from "@/server/classroomReports/types";

const body: React.CSSProperties = { margin: 0, whiteSpace: "pre-wrap", font: "var(--weight-regular) 15px/1.6 var(--font-body)", color: "var(--text-body)" };

function Label({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <Icon name={icon} size={18} color="var(--cyan-600)" />
      <span style={{ font: "var(--weight-bold) 14px/1.3 var(--font-display)", color: "var(--text-heading)" }}>{text}</span>
    </div>
  );
}

/** Contenido de un reporte (solo lectura): resumen, comentario por skill y comentarios finales. */
export function ReportView({ report }: { report: ReportItem }) {
  const skills = SKILLS.filter((s) => report.skills[s.key]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {report.summary && (
        <div>
          <Label icon="clipboard-text" text="Resumen" />
          <p style={body}>{report.summary}</p>
        </div>
      )}
      {skills.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
          {skills.map((s) => (
            <div key={s.key} style={{ padding: "var(--space-3) var(--space-4)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
              <Label icon={s.icon} text={s.label} />
              <p style={body}>{report.skills[s.key]}</p>
            </div>
          ))}
        </div>
      )}
      {report.comments && (
        <div>
          <Label icon="chat-teardrop-text" text="Comentarios y recomendaciones" />
          <p style={body}>{report.comments}</p>
        </div>
      )}
    </div>
  );
}
