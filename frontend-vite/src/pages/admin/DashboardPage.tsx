import { useAuth } from "@/auth/useAuth";
import { useDashboardData } from "@/features/dashboard/hooks";
import { useStudentBalanceAlerts } from "@/features/balanceAlerts/hooks";
import { classifyStudentBalance } from "@/lib/hours/balanceStatus";
import { formatLongDateInLima } from "@/lib/datetime/lima";
import type { DashboardData, KpiValue } from "@/server/dashboard/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { DashboardHeader } from "@/components/admin/dashboard/Header";
import { Kpis } from "@/components/admin/dashboard/Kpis";
import { WeeklyAgenda } from "@/components/admin/dashboard/WeeklyAgenda";
import { OperationalAlertsPanel } from "@/components/admin/dashboard/OperationalAlertsPanel";
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

/**
 * Ajuste post-Slice H: "X clase(s) programada(s)" se prestaba a confusión con clases REALMENTE
 * ocurridas -- class_schedules es planificación referencial (ver server/dashboard/types.ts). El
 * conteo de alertas ahora suma saldo (Slice G) + operativas, porque el panel de la derecha las
 * muestra juntas.
 */
function buildContextSentence(data: DashboardData, balanceAlertsCount: number | null): string {
  const agendaCount = data.agenda.status === "ok" ? data.agenda.data.length : null;
  const operationalCount = data.alerts.status === "ok" ? data.alerts.data.length : null;

  const agendaPart = agendaCount === null ? null : agendaCount === 0 ? "no tienes horarios previstos esta semana" : `tienes ${agendaCount} horario(s) previsto(s) esta semana`;

  const alertsKnown = operationalCount !== null && balanceAlertsCount !== null;
  const totalAlerts = (operationalCount ?? 0) + (balanceAlertsCount ?? 0);
  const alertsPart = !alertsKnown ? null : totalAlerts === 0 ? "ninguna alerta operativa" : `${totalAlerts} alerta(s) operativa(s)`;

  const parts = [agendaPart, alertsPart].filter((p): p is string => p !== null);
  return parts.length > 0 ? `Esta semana ${parts.join(" · ")}.` : "Este es el resumen de tu academia.";
}

/** "Sin saldo" (estudiantes activos con balance <= 0) reutiliza get_student_balance_alerts
 * (Slice G) -- nunca una query/definición de saldo nueva (ver classifyStudentBalance). */
function studentsWithoutBalanceKpi(balanceAlertsQuery: ReturnType<typeof useStudentBalanceAlerts>): KpiValue {
  if (balanceAlertsQuery.isError || !balanceAlertsQuery.data) return { status: "error" };
  return { status: "ok", value: balanceAlertsQuery.data.filter((item) => classifyStudentBalance(item.balance) === "empty").length };
}

/** Portado de src/app/admin/page.tsx -- getDashboardData() ahora corre browser->Supabase->RLS
 * en vez de en el servidor Next. Ajuste post-Slice H: la Agenda semanal (class_schedules) reemplaza
 * "Clases de hoy", y las alertas de saldo (Slice G) + operativas viven en un único panel. */
export function DashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError } = useDashboardData();
  const balanceAlertsQuery = useStudentBalanceAlerts();

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
  const balanceAlertsCount = balanceAlertsQuery.data ? balanceAlertsQuery.data.length : balanceAlertsQuery.isError ? 0 : null;
  const showAlertsGrid = data.alerts.status === "ok" && !!balanceAlertsQuery.data && balanceAlertsQuery.data.length + data.alerts.data.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <DashboardHeader
        firstName={profile.first_name}
        dateLabel={formatLongDateInLima(now)}
        contextSentence={buildContextSentence(data, balanceAlertsCount)}
      />

      {data.kpis.status === "ok" ? (
        <Kpis kpis={data.kpis.data} studentsWithoutBalance={studentsWithoutBalanceKpi(balanceAlertsQuery)} />
      ) : (
        <SectionError />
      )}

      {/* Agenda semanal a ancho completo (segunda iteración de layout): el problema real de
          legibilidad era el ancho disponible, no el estilo de las cards de evento -- compartir fila
          con Alertas dejaba muy poco espacio horizontal para 7 días + clases solapadas. Alertas
          baja debajo, a su propio ancho completo. */}
      <Card>{data.agenda.status === "ok" ? <WeeklyAgenda blocks={data.agenda.data} /> : <SectionError />}</Card>

      {/* `.xp-dashboard-alerts-grid` reparte las filas de OperationalAlertsPanel en columnas cuando
          hay suficiente ancho, sin tocar ese componente (fuera del alcance permitido de este
          cambio): su raíz ya es un `display:flex;flexDirection:column` fijo por estilo inline, así
          que necesitamos `!important` para reemplazar SOLO `display` (nunca gap/orden/contenido) --
          la clase solo se aplica cuando `showAlertsGrid` confirma que ese hijo es la lista real de
          alertas (nunca el EmptyState/Spinner/SectionError, que deben seguir centrados en una sola
          columna). `auto-fit` colapsa las columnas vacías: con 1 sola alerta se ve igual que antes
          (una columna), con varias se reparten en 2+ según el ancho disponible. */}
      <style>{`
        .xp-dashboard-alerts-grid > div {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-3);
        }
      `}</style>
      <Card header={cardTitle("Alertas")}>
        {data.alerts.status === "ok" ? (
          balanceAlertsQuery.isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
              <Spinner size={22} label="Cargando…" />
            </div>
          ) : balanceAlertsQuery.isError || !balanceAlertsQuery.data ? (
            <SectionError />
          ) : (
            <div className={showAlertsGrid ? "xp-dashboard-alerts-grid" : undefined}>
              <OperationalAlertsPanel balanceAlerts={balanceAlertsQuery.data} operationalAlerts={data.alerts.data} />
            </div>
          )
        ) : (
          <SectionError />
        )}
      </Card>

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
