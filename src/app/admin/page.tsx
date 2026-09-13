import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/server/dashboard/queries";
import { formatLongDateInLima } from "@/lib/datetime/lima";
import type { DashboardData } from "@/server/dashboard/types";
import { Card } from "@/components/ui/surfaces/Card";
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

// El layout (admin/layout.tsx) ya llama a requireRole("admin"), que internamente
// resuelve auth.getUser() + el profile del admin. Esta página vuelve a llamar
// requireProfile() para obtener el nombre del saludo, duplicando esa consulta dentro
// del mismo request. Es una duplicación real y conocida -- no se resuelve aquí con
// React.cache() porque esa optimización quedó explícitamente fuera de este bloque.
export default async function AdminDashboardPage() {
  const [profile, supabase] = [await requireProfile(), createClient()];
  const now = new Date();
  const data = await getDashboardData(supabase, now);

  for (const [name, section] of Object.entries(data)) {
    if (section.status === "error") {
      console.error(`[admin/dashboard] sección "${name}" falló:`, section.message);
    }
  }

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
