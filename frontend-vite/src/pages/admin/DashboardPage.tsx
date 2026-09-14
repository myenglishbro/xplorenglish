import { useAuth } from "@/auth/useAuth";
import { useDashboardData } from "@/features/dashboard/hooks";
import { formatLongDateInLima } from "@/lib/datetime/lima";
import type { DashboardData } from "@/server/dashboard/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { DashboardHeader } from "@/components/admin/dashboard/Header";
import { Kpis } from "@/components/admin/dashboard/Kpis";
import { ClassesToday } from "@/components/admin/dashboard/ClassesToday";
import { Alerts } from "@/components/admin/dashboard/Alerts";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { RecentStudents } from "@/components/admin/dashboard/RecentStudents";
import { SectionError } from "@/components/admin/dashboard/SectionError";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

function buildContextSentence(data: DashboardData): string {
  const sessionsToday = data.kpis.status === "ok" ? data.kpis.data.todaySessionsCount : null;
  const alertsCount = data.alerts.status === "ok" ? data.alerts.data.length : null;

  const sessionsPart =
    sessionsToday && sessionsToday.status === "ok"
      ? sessionsToday.value === 0
        ? "no tienes clases programadas"
        : `tienes ${sessionsToday.value} clase(s) programada(s)`
      : null;

  const alertsPart = alertsCount === null ? null : alertsCount === 0 ? "ninguna alerta pendiente" : `${alertsCount} alerta(s) pendiente(s)`;

  const parts = [sessionsPart, alertsPart].filter((p): p is string => p !== null);
  return parts.length > 0 ? `Hoy ${parts.join(" · ")}.` : "Este es el resumen de tu academia.";
}

/** Portado de src/app/admin/page.tsx -- getDashboardData() ahora corre browser->Supabase->RLS
 * en vez de en el servidor Next, pero las 5 secciones y su aislamiento por sección son idénticos. */
export function DashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError } = useDashboardData();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (isError || !data || !profile) {
    return <EmptyState icon="warning" title="No pudimos cargar el dashboard">Recarga la página para intentarlo de nuevo.</EmptyState>;
  }

  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <DashboardHeader
        firstName={profile.first_name}
        dateLabel={formatLongDateInLima(now)}
        contextSentence={buildContextSentence(data)}
      />

      {data.kpis.status === "ok" ? <Kpis kpis={data.kpis.data} /> : <SectionError />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Clases de hoy")}>
          {data.classes.status === "ok" ? <ClassesToday classes={data.classes.data} /> : <SectionError />}
        </Card>
        <Card header={cardTitle("Alertas")}>{data.alerts.status === "ok" ? <Alerts alerts={data.alerts.data} /> : <SectionError />}</Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Actividad reciente")}>
          {data.recentActivity.status === "ok" ? <RecentActivity items={data.recentActivity.data} /> : <SectionError />}
        </Card>
        <Card header={cardTitle("Estudiantes recién registrados")}>
          {data.recentStudents.status === "ok" ? <RecentStudents students={data.recentStudents.data} /> : <SectionError />}
        </Card>
      </div>
    </div>
  );
}
