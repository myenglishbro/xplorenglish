import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { Icon } from "@/components/ui/core/Icon";
import { Tag } from "@/components/ui/core/Tag";
import { Button } from "@/components/ui/core/Button";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { ContentEditor } from "@/components/content/ContentEditor";
import { useClassroomPeople } from "@/features/classroomOverview/hooks";
import { useClassSchedules } from "@/features/schedulingAdmin/hooks";
import { useClassroomBalance, useClassroomHistory } from "@/features/classRecords/hooks";
import { ClassroomClassesSection } from "@/features/classRecords/components/ClassroomClassesSection";
import { RegisterClassButton } from "@/features/classRecords/components/RegisterClassButton";
import { ClassroomActivitiesSection } from "@/features/activities/components/ClassroomActivitiesSection";
import { useClassroomActivities, useClassroomSubmissions } from "@/features/activities/hooks";
import { ClassroomReportsSection } from "@/features/classroomReports/components/ClassroomReportsSection";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";
import type { ModuleItem } from "@/server/classrooms/content/types";

type TabKey = "resumen" | "clases" | "actividades" | "reportes" | "contenido";
const TAB_KEYS: TabKey[] = ["resumen", "clases", "actividades", "reportes", "contenido"];

const STATUS_LABEL = { present: "Presente", absent: "Ausente", rescheduled: "Reprogramada" } as const;
const STATUS_TONE = { present: "success", absent: "warning", rescheduled: "neutral" } as const;

const sectionTitle = (icon: string, text: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Icon name={icon} size={18} color="var(--cyan-600)" />
    <h3 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>{text}</h3>
  </div>
);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function PersonRow({ name, caption }: { name: string; caption: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          width: 38,
          height: 38,
          flex: "0 0 auto",
          borderRadius: "50%",
          background: "var(--surface-accent-subtle)",
          color: "var(--cyan-700)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          font: "var(--weight-bold) 13px/1 var(--font-display)",
        }}
      >
        {initials(name)}
      </span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ font: "var(--weight-semibold) 15px/1.3 var(--font-body)", color: "var(--text-heading)" }}>{name}</span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{caption}</span>
      </div>
    </div>
  );
}

export interface TeacherSalonViewProps {
  classroomId: number;
  name: string;
  programName: string | null;
  level: string;
  modules: ModuleItem[];
}

/**
 * Vista del docente de un salón, organizada en 4 pestañas (la pestaña vive en `?tab=` para poder
 * volver/compartir el enlace): Resumen (lo que importa de un vistazo), Clases (registrar +
 * historial), Actividades (banco -> salón + entregas) y Contenido (módulos/lecciones).
 */
export function TeacherSalonView({ classroomId, name, programName, level, modules }: TeacherSalonViewProps) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as TabKey | null;
  const tab: TabKey = requested && TAB_KEYS.includes(requested) ? requested : "resumen";
  const setTab = (t: string) => setParams(t === "resumen" ? {} : { tab: t }, { replace: true });

  const peopleQuery = useClassroomPeople(classroomId);
  const schedulesQuery = useClassSchedules(classroomId);
  const balanceQuery = useClassroomBalance(classroomId);
  const historyQuery = useClassroomHistory(classroomId);
  const activitiesQuery = useClassroomActivities(classroomId);
  const submissionsQuery = useClassroomSubmissions(classroomId);

  const hasStudent = !!peopleQuery.data?.studentId;
  const history = historyQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  // Entregas de writing/speaking que aún esperan feedback del docente.
  const kindOf = new Map(activities.map((a) => [a.id, a.kind]));
  const toReview = submissions.filter((s) => !s.feedback && (kindOf.get(s.activityId) === "writing" || kindOf.get(s.activityId) === "speaking")).length;
  const balance = balanceQuery.data;
  const balanceStatus = balance !== undefined && balance !== null ? getStudentBalanceStatus(balance) : null;
  const schedules = (schedulesQuery.data ?? []).filter((s) => s.isActive);
  const taught = history.filter((h) => h.status === "present").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Link
          to="/teacher/salones"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none", width: "fit-content" }}
        >
          <Icon name="arrow-left" size={14} /> Mis salones
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <div>
            <h1 style={{ font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)", letterSpacing: "var(--text-h2-ls)", color: "var(--text-heading)", margin: 0 }}>{name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8 }}>
              {programName && <Tag tone="neutral">{programName}</Tag>}
              <Tag tone="accent">Nivel {level}</Tag>
              {peopleQuery.data?.studentName && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14 }}>
                  <Icon name="student" size={16} /> {peopleQuery.data.studentName}
                </span>
              )}
            </div>
          </div>
          <RegisterClassButton classroomId={classroomId} disabled={!hasStudent} />
        </div>
        <Tabs
          items={[
            { value: "resumen", label: "Resumen" },
            { value: "clases", label: "Clases" },
            { value: "actividades", label: toReview > 0 ? `Actividades (${toReview} por revisar)` : "Actividades" },
            { value: "reportes", label: "Reportes" },
            { value: "contenido", label: "Contenido" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </header>

      {tab === "resumen" && (
        <>
          {!peopleQuery.isLoading && !hasStudent && (
            <Alert tone="warning" title="Este salón aún no tiene estudiante">
              No podrás registrar clases hasta que un administrador asigne a un estudiante.
            </Alert>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-3)" }}>
            <StatCard
              label="Saldo del estudiante"
              icon="clock"
              value={balance !== undefined && balance !== null ? `${balance} min` : "—"}
              note={balanceStatus ? <Tag tone={balanceStatus.tone}>{balanceStatus.label}</Tag> : undefined}
            />
            <StatCard label="Clases dictadas" icon="chalkboard-teacher" value={taught} />
            <StatCard label="Actividades asignadas" icon="list-checks" value={activities.length} />
            <StatCard
              label="Por revisar"
              icon="chat-teardrop-text"
              tone="brand"
              value={toReview}
              note={toReview > 0 ? <button type="button" onClick={() => setTab("actividades")} style={{ border: 0, background: "none", padding: 0, color: "var(--orange-700)", cursor: "pointer", fontWeight: 600 }}>Dar feedback →</button> : undefined}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            <Card header={sectionTitle("users-three", "Personas")}>
              {peopleQuery.isLoading ? (
                <Spinner size={20} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {peopleQuery.data?.studentName ? (
                    <PersonRow name={peopleQuery.data.studentName} caption="Estudiante" />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>Sin estudiante asignado</span>
                  )}
                  {(peopleQuery.data?.teachers ?? []).map((t) => (
                    <PersonRow key={t.id} name={`${t.firstName} ${t.lastName}`} caption={t.id === user?.id ? "Docente · tú" : "Docente"} />
                  ))}
                </div>
              )}
            </Card>

            <Card header={sectionTitle("calendar-blank", "Horario semanal")}>
              {schedulesQuery.isLoading ? (
                <Spinner size={20} />
              ) : schedules.length === 0 ? (
                <span style={{ color: "var(--text-muted)" }}>Sin horario configurado</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {schedules.map((s) => (
                    <span
                      key={s.id}
                      style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", font: "var(--weight-semibold) 14px/1.2 var(--font-body)", color: "var(--text-heading)" }}
                    >
                      {DAY_OF_WEEK_LABELS[s.dayOfWeek]} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card
            header={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {sectionTitle("clock-counter-clockwise", "Últimas clases")}
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setTab("clases")}>
                    Ver todas
                  </Button>
                )}
              </div>
            }
          >
            {historyQuery.isLoading ? (
              <Spinner size={20} />
            ) : history.length === 0 ? (
              <span style={{ color: "var(--text-muted)" }}>Cuando registres la primera clase, aparecerá aquí.</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.slice(0, 4).map((h, i) => (
                  <div
                    key={h.id}
                    style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                  >
                    <span style={{ font: "var(--weight-semibold) 14px/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                      {formatShortDateInLima(h.occurredAt)} · {formatTimeInLima(h.occurredAt)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{h.minutes} min</span>
                      <Tag tone={STATUS_TONE[h.status]}>{STATUS_LABEL[h.status]}</Tag>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "clases" && <ClassroomClassesSection classroomId={classroomId} hasStudent={hasStudent} role="teacher" currentTeacherId={user?.id} hideRegister />}

      {tab === "actividades" && <ClassroomActivitiesSection classroomId={classroomId} role="teacher" />}

      {tab === "reportes" && <ClassroomReportsSection classroomId={classroomId} role="teacher" />}

      {tab === "contenido" && <ContentEditor classroomId={classroomId} modules={modules} />}
    </div>
  );
}
